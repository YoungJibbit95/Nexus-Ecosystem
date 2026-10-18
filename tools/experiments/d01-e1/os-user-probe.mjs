// Uses an existing unprivileged account only; never creates accounts or stores credentials.
import { spawnSync } from 'node:child_process'

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
  if (!probe.stdout?.trim()) return { status: 'NOT VERIFIED', reason: 'Different-user execution of the selected Node binary unavailable' }
  const observed = JSON.parse(probe.stdout)
  if (probe.status !== 0 || observed.uid === process.getuid() || observed.result !== 'DENIED') throw new Error('Different-user UDS access was not denied with EACCES')
  return { status: 'VERIFIED: actual different-UID process denied', errno: observed.errno }
}
