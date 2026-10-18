// Uses an existing unprivileged account only; never creates accounts or stores credentials.
import { spawnSync } from 'node:child_process'

export function differentUserProbe(descriptor) {
  if (process.platform !== 'darwin' || descriptor.candidate !== 'uds') return { status: 'NOT VERIFIED', reason: 'No separately authenticated Windows test account in this harness' }
  const identity = spawnSync('/usr/bin/sudo', ['-n', '-u', 'nobody', '/usr/bin/id', '-u'], { encoding: 'utf8', timeout: 5000 })
  if (identity.status !== 0 || Number(identity.stdout.trim()) === process.getuid()) return { status: 'NOT VERIFIED', reason: 'Noninteractive different-user execution unavailable' }
  const code = `import socket,sys,os,json,errno
s=socket.socket(socket.AF_UNIX)
try:
 s.connect(sys.argv[1]); print(json.dumps({'uid':os.getuid(),'result':'CONNECTED'})); sys.exit(4)
except OSError as e:
 print(json.dumps({'uid':os.getuid(),'result':'DENIED' if e.errno==errno.EACCES else 'OTHER','errno':e.errno})); sys.exit(0 if e.errno==errno.EACCES else 5)
finally: s.close()`
  const probe = spawnSync('/usr/bin/sudo', ['-n', '-u', 'nobody', '/usr/bin/python3', '-c', code, descriptor.endpoint], { encoding: 'utf8', timeout: 8000 })
  if (!probe.stdout?.trim()) return { status: 'NOT VERIFIED', reason: 'Different-user Python socket probe unavailable' }
  const observed = JSON.parse(probe.stdout)
  if (probe.status !== 0 || observed.uid === process.getuid() || observed.result !== 'DENIED') throw new Error('Different-user UDS access was not denied with EACCES')
  return { status: 'VERIFIED: actual different-UID process denied', errno: observed.errno }
}
