// Uses an existing unprivileged account only; never creates accounts or stores credentials.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

export function differentUserProbe(descriptor) {
  if (process.platform !== 'darwin' || descriptor.candidate !== 'uds') return { status: 'NOT VERIFIED', reason: descriptor.candidate === 'loopback' ? 'No actual different-user TCP/credential experiment' : 'No separately authenticated Windows test account in this harness' }
  const identity = spawnSync('/usr/bin/sudo', ['-n', '-u', 'nobody', '/usr/bin/id', '-u'], { cwd: '/tmp', encoding: 'utf8', timeout: 5000 })
  if (identity.status !== 0 || Number(identity.stdout.trim()) === process.getuid()) return { status: 'NOT VERIFIED', reason: 'Noninteractive different-user execution unavailable' }
  // Use the already selected Node binary, not an unqualified system Python shim.
  // /tmp avoids requiring the foreign user to traverse the private CI checkout.
  const code = `const net=require('node:net');
const s=net.connect(process.argv[1]);
const timer=setTimeout(()=>{s.destroy();process.exit(6)},2000);
s.once('connect',()=>{clearTimeout(timer);console.log(JSON.stringify({uid:process.getuid(),result:'CONNECTED'}));s.destroy();process.exitCode=4});
s.once('error',e=>{clearTimeout(timer);console.log(JSON.stringify({uid:process.getuid(),result:e.code==='EACCES'?'DENIED':'OTHER',errno:e.code}));process.exitCode=e.code==='EACCES'?0:5});`
  const probe = spawnSync('/usr/bin/sudo', ['-n', '-u', 'nobody', process.execPath, '-e', code, descriptor.endpoint], { cwd: '/tmp', encoding: 'utf8', timeout: 8000 })
  if (!probe.stdout?.trim()) {
    // Hosted Node may be below a user-private toolcache. Build a tiny system-SDK
    // probe in a separate temporary binary directory; never loosen the UDS parent.
    // Apple's nc does not expose errno for this case and cannot qualify EACCES.
    const directory = fs.mkdtempSync('/tmp/nxd01-probe-')
    const binary = path.join(directory, 'connect-probe')
    try {
      const source = `#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <errno.h>
#include <stdio.h>
#include <string.h>
int main(int argc,char **argv) {
  if(argc!=2) return 7;
  struct sockaddr_un address; memset(&address,0,sizeof(address));
  address.sun_family=AF_UNIX; address.sun_len=sizeof(address);
  if(strlen(argv[1])>=sizeof(address.sun_path)) return 7;
  memcpy(address.sun_path,argv[1],strlen(argv[1])+1);
  int fd=socket(AF_UNIX,SOCK_STREAM,0); if(fd<0) return 7;
  int result=connect(fd,(struct sockaddr *)&address,sizeof(address));
  int error=result==0?0:errno; close(fd);
  printf("{\\"uid\\":%lu,\\"result\\":\\"%s\\",\\"errno\\":%d}\\n",(unsigned long)getuid(),error==EACCES?"DENIED":result==0?"CONNECTED":"OTHER",error);
  return error==EACCES?0:4;
}`
      const compile = spawnSync('/usr/bin/clang', ['-x', 'c', '-Wall', '-Werror', '-o', binary, '-'], { cwd: '/tmp', input: source, encoding: 'utf8', timeout: 15_000 })
      if (compile.status !== 0) return { status: 'NOT VERIFIED', reason: 'Native SDK foreign-user probe compilation unavailable' }
      fs.chmodSync(directory, 0o755); fs.chmodSync(binary, 0o755)
      const fallback = spawnSync('/usr/bin/sudo', ['-n', '-u', 'nobody', binary, descriptor.endpoint], { cwd: '/tmp', encoding: 'utf8', timeout: 5000 })
      if (!fallback.stdout?.trim()) return { status: 'NOT VERIFIED', reason: 'Native foreign-user probe execution unavailable' }
      const observed = JSON.parse(fallback.stdout)
      if (fallback.status !== 0 || observed.uid !== (Number(identity.stdout.trim()) >>> 0) || observed.uid === process.getuid() || observed.result !== 'DENIED' || observed.errno !== 13) throw new Error('Actual different-user native connect was not denied with EACCES')
      return { status: 'VERIFIED: actual different-UID process denied', client: 'native SDK connect probe', errno: observed.errno }
    } finally {
      const entry = fs.lstatSync(binary, { throwIfNoEntry: false })
      if (entry?.isFile() && !entry.isSymbolicLink()) fs.unlinkSync(binary)
      fs.rmdirSync(directory) // Exact owned binary/empty directory only; never recursive.
    }
  }
  const observed = JSON.parse(probe.stdout)
  if (probe.status !== 0 || observed.uid === process.getuid() || observed.result !== 'DENIED') throw new Error('Different-user UDS access was not denied with EACCES')
  return { status: 'VERIFIED: actual different-UID process denied', errno: observed.errno }
}
