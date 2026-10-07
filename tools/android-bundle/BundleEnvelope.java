import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.jar.JarFile;

/** Reads the archive as data only. Does not extract files or load its classes. */
class BundleEnvelope {
    public static void main(String[] args) {
        try {
            if (args.length != 2 || !(args[1].equals("unsigned") || args[1].equals("signed"))) throw new Exception();
            Path path = Path.of(args[0]);
            if (Files.isSymbolicLink(path) || !Files.isRegularFile(path) || Files.size(path) > 512L * 1024 * 1024) throw new Exception();
            Set<String> names = new HashSet<>();
            boolean signature = false;
            long total = 0;
            byte[] buffer = new byte[65536];
            try (JarFile jar = new JarFile(path.toFile(), true)) {
                var entries = jar.entries();
                while (entries.hasMoreElements()) {
                    var entry = entries.nextElement();
                    String name = entry.getName();
                    if (name.isEmpty() || name.startsWith("/") || name.contains("\\") || name.contains(":") || name.chars().anyMatch(c -> c < 32 || c == 127) || !names.add(name) || names.size() > 100000) throw new Exception();
                    for (String part : name.split("/", -1)) if (part.equals("..") || part.equals(".")) throw new Exception();
                    String upper = name.toUpperCase(Locale.ROOT);
                    boolean signatureFile = upper.matches("META-INF/[^/]+\\.(SF|RSA|DSA|EC)") || upper.startsWith("META-INF/SIG-");
                    if (signatureFile) {
                        signature = true;
                        if (args[1].equals("unsigned")) throw new Exception();
                        if (!upper.matches("META-INF/NEXUS\\.(SF|RSA|DSA|EC)")) throw new Exception();
                    }
                    if (entry.isDirectory()) continue;
                    long size = 0;
                    try (InputStream input = jar.getInputStream(entry)) {
                        int read;
                        while ((read = input.read(buffer)) != -1) {
                            size += read; total += read;
                            if (size > 256L * 1024 * 1024 || total > 1024L * 1024 * 1024) throw new Exception();
                        }
                    }
                    // Reading completely triggers the JDK's digest verification.
                    // Alias/key trust is checked separately by jarsigner -strict.
                    if (args[1].equals("signed") && !signatureFile && !upper.equals("META-INF/MANIFEST.MF") && entry.getCodeSigners() == null) throw new Exception();
                }
            }
            if (!names.contains("BundleConfig.pb") || !names.contains("base/manifest/AndroidManifest.xml") || (args[1].equals("signed") && !signature)) throw new Exception();
            System.out.println("Android bundle envelope verified");
        } catch (Exception error) {
            System.err.println("Invalid Android bundle envelope");
            System.exit(1);
        }
    }
}
