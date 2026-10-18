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
  if (!probe.stdout?.trim()) {
    // Hosted toolcache binaries can be below a user-private parent. macOS's
    // system nc can prove the connect denial without copying a runtime or chmod.
    const fallback = spawnSync('/usr/bin/sudo', ['-n', '-u', 'nobody', '/bin/sh', '-c', '/usr/bin/id -u; exec /usr/bin/nc -w 1 -U "$1" </dev/null', 'd01-e1', descriptor.endpoint], { cwd: '/tmp', env: { ...process.env, LC_ALL: 'C' }, encoding: 'utf8', timeout: 5000 })
    const uidText = fallback.stdout?.trim() || '', uid = Number(uidText)
    if (!/^[0-9]+$/.test(uidText) || uid !== Number(identity.stdout.trim()) || uid === process.getuid()) return { status: 'NOT VERIFIED', reason: 'Different-user process identity unavailable' }
    if (/nc:.*connect.*Permission denied/.test(fallback.stderr || '') && fallback.status !== 0) return { status: 'VERIFIED: actual different-UID process denied', client: 'macOS system nc', diagnostic: 'connect: Permission denied' }
    if (/not found|unable to execute|unable to exec/.test(fallback.stderr || '')) return { status: 'NOT VERIFIED', reason: 'Neither selected Node nor system socket probe executable' }
    throw new Error('Native different-user socket probe did not establish access denial')
  }
  const observed = JSON.parse(probe.stdout)
  if (probe.status !== 0 || observed.uid === process.getuid() || observed.result !== 'DENIED') throw new Error('Different-user UDS access was not denied with EACCES')
  return { status: 'VERIFIED: actual different-UID process denied', errno: observed.errno }
}
