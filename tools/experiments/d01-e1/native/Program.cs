// Experiment-only byte bridge. No Nexus methods, credentials, stores or Electron.
using System.Buffers.Binary;
using System.ComponentModel;
using System.IO.Pipes;
using System.Runtime.InteropServices;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Text.Json;
using Microsoft.Win32.SafeHandles;

if (!OperatingSystem.IsWindows() || args.Length != 1 || !System.Text.RegularExpressions.Regex.IsMatch(args[0], @"\Anexus-d01e1-[0-9a-f]{32}\z")) return 2;
using var lifetime = new CancellationTokenSource();
var output = new SemaphoreSlim(1);
var requests = new System.Collections.Concurrent.ConcurrentDictionary<int, TaskCompletionSource<byte[]>>();
var streams = new List<NamedPipeServerStream>();
var user = WindowsIdentity.GetCurrent().User ?? throw new InvalidOperationException("No current user SID");
// User, not WindowsIdentity.Owner (which may be the Administrators group).
var sddl = $"O:{user.Value}D:P(A;;GA;;;{user.Value})";
var pipeName = @"\\.\pipe\" + args[0];

async Task Emit(object value)
{
    await output.WaitAsync();
    try { await Console.Out.WriteLineAsync(JsonSerializer.Serialize(value)); await Console.Out.FlushAsync(); }
    finally { output.Release(); }
}

async Task ReadExactly(Stream stream, byte[] bytes, CancellationToken cancellation)
{
    int offset = 0;
    while (offset < bytes.Length)
    {
        int count = await stream.ReadAsync(bytes.AsMemory(offset), cancellation);
        if (count == 0) throw new EndOfStreamException();
        offset += count;
    }
}

async Task Serve(NamedPipeServerStream pipe, int connection)
{
    while (!lifetime.IsCancellationRequested)
    {
        bool connected = false;
        try
        {
            await pipe.WaitForConnectionAsync(lifetime.Token);
            connected = true;
            using var deadline = CancellationTokenSource.CreateLinkedTokenSource(lifetime.Token);
            deadline.CancelAfter(TimeSpan.FromSeconds(2));
            var header = new byte[4];
            await ReadExactly(pipe, header, deadline.Token);
            uint size = BinaryPrimitives.ReadUInt32BigEndian(header);
            if (size == 0 || size > 8192) throw new InvalidDataException();
            var payload = new byte[size];
            await ReadExactly(pipe, payload, deadline.Token);
            var pending = new TaskCompletionSource<byte[]>(TaskCreationOptions.RunContinuationsAsynchronously);
            if (!requests.TryAdd(connection, pending)) throw new InvalidOperationException();
            try
            {
                await Emit(new { @event = "frame", connection, payload = Convert.ToBase64String(payload) });
                var response = await pending.Task.WaitAsync(deadline.Token);
                if (response.Length == 0 || response.Length > 8192) throw new InvalidDataException();
                BinaryPrimitives.WriteUInt32BigEndian(header, (uint)response.Length);
                await pipe.WriteAsync(header, deadline.Token);
                await pipe.WriteAsync(response, deadline.Token);
                await pipe.FlushAsync(deadline.Token);
                // Do not disconnect until the client has consumed its frame and closed.
                // A blocking WaitForPipeDrain would give an untrusted client an unbounded wait.
                await pipe.ReadAsync(new byte[1], deadline.Token);
            }
            finally { requests.TryRemove(connection, out _); }
        }
        catch (Exception error) when (error is IOException or OperationCanceledException or ObjectDisposedException) { }
        finally
        {
            // Read EOF changes IsConnected to false/Broken, but the native handle
            // still needs Disconnect before the next WaitForConnection.
            try { if (connected && !pipe.SafePipeHandle.IsClosed) pipe.Disconnect(); }
            catch (Exception error) when (error is IOException or ObjectDisposedException) { }
        }
    }
}

try
{
    // Hold all instances for the entire helper lifetime, including the first.
    // First-instance exclusivity remains in force between client connections.
    for (int slot = 0; slot < 8; slot++)
    {
        var handle = Native.Create(pipeName, sddl, slot == 0);
        streams.Add(new NamedPipeServerStream(PipeDirection.InOut, true, false, handle));
    }
    var actual = new RawSecurityDescriptor(Native.Security(streams[0].SafePipeHandle));
    var dacl = actual.DiscretionaryAcl;
    bool ownerMatches = actual.Owner == user;
    bool allowCurrentUserOnly = dacl is { Count: 1 } && dacl[0] is CommonAce ace
        && ace.AceQualifier == AceQualifier.AccessAllowed && ace.SecurityIdentifier == user
        && (actual.ControlFlags & ControlFlags.DiscretionaryAclProtected) != 0;
    if (!ownerMatches || !allowCurrentUserOnly) throw new InvalidOperationException("Unexpected actual pipe ACL");
    await Emit(new { @event = "ready", ownerMatches, allowCurrentUserOnly, rejectRemote = true, firstInstance = true, maxConnections = 8, runtime = Environment.Version.ToString() });
    var serving = streams.Select((pipe, index) => Serve(pipe, index)).ToArray();
    try
    {
        // Anonymous inherited stdin is the only control channel. EOF after parent death closes all handles.
        while (await Console.In.ReadLineAsync() is { } line)
        {
            if (line.Length > 12000) throw new InvalidDataException();
            using var document = JsonDocument.Parse(line);
            var root = document.RootElement;
            int connection = root.GetProperty("connection").GetInt32();
            var response = Convert.FromBase64String(root.GetProperty("payload").GetString()!);
            if (response.Length == 0 || response.Length > 8192 || !requests.TryGetValue(connection, out var pending)) throw new InvalidDataException();
            pending.TrySetResult(response);
        }
    }
    finally
    {
        lifetime.Cancel();
        streams.ForEach(pipe => pipe.Dispose());
        await Task.WhenAll(serving);
    }
    return 0;
}
catch { return 3; }
finally { lifetime.Cancel(); streams.ForEach(pipe => pipe.Dispose()); }

internal static class Native
{
    [StructLayout(LayoutKind.Sequential)]
    private struct Attributes { public int Length; public IntPtr Descriptor; [MarshalAs(UnmanagedType.Bool)] public bool Inherit; }
    [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool ConvertStringSecurityDescriptorToSecurityDescriptor(string sddl, uint revision, out IntPtr descriptor, out uint size);
    [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool ConvertSecurityDescriptorToStringSecurityDescriptor(IntPtr descriptor, uint revision, uint info, out IntPtr text, out uint size);
    [DllImport("advapi32.dll", SetLastError = true)]
    private static extern uint GetSecurityInfo(SafePipeHandle handle, uint kind, uint info, out IntPtr owner, out IntPtr group, out IntPtr dacl, out IntPtr sacl, out IntPtr descriptor);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern SafePipeHandle CreateNamedPipe(string name, uint mode, uint pipeMode, uint instances, uint outbound, uint inbound, uint timeout, ref Attributes security);
    [DllImport("kernel32.dll")]
    private static extern IntPtr LocalFree(IntPtr memory);

    internal static SafePipeHandle Create(string name, string sddl, bool first)
    {
        if (!ConvertStringSecurityDescriptorToSecurityDescriptor(sddl, 1, out var descriptor, out _)) throw new Win32Exception();
        try
        {
            var attributes = new Attributes { Length = Marshal.SizeOf<Attributes>(), Descriptor = descriptor, Inherit = false };
            // DUPLEX | OVERLAPPED | FIRST_PIPE_INSTANCE; BYTE | WAIT | REJECT_REMOTE_CLIENTS.
            var handle = CreateNamedPipe(name, 3u | 0x40000000u | (first ? 0x00080000u : 0u), 0x8, 8, 8196, 8196, 0, ref attributes);
            if (handle.IsInvalid) { var error = Marshal.GetLastWin32Error(); handle.Dispose(); throw new Win32Exception(error); }
            return handle;
        }
        finally { LocalFree(descriptor); }
    }

    internal static string Security(SafePipeHandle handle)
    {
        uint result = GetSecurityInfo(handle, 6, 5, out _, out _, out _, out _, out var descriptor);
        if (result != 0) throw new Win32Exception((int)result);
        try
        {
            if (!ConvertSecurityDescriptorToStringSecurityDescriptor(descriptor, 1, 5, out var text, out _)) throw new Win32Exception();
            try { return Marshal.PtrToStringUni(text)!; }
            finally { LocalFree(text); }
        }
        finally { LocalFree(descriptor); }
    }
}
