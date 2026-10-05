import { scan } from './scan.mjs'
import { installScanner } from './runtime.mjs'

try {
  const executable = await installScanner()
  const tree = await scan('tree', { executable })
  console.log(JSON.stringify(tree, null, 2))
  let failed = tree.findings.length > 0
  const base = process.env.NEXUS_SCAN_BASE
  const head = process.env.NEXUS_SCAN_HEAD
  if (base && base !== '0'.repeat(40)) {
    const range = await scan('range', { executable, base, head })
    console.log(JSON.stringify(range, null, 2))
    failed ||= range.findings.length > 0
  } else {
    console.log('No previous commit supplied (manual/initial push); current source checked. History is a separate incident audit.')
  }
  process.exitCode = failed ? 1 : 0
} catch (error) {
  console.error('Secret scan incomplete: ' + error.message)
  process.exitCode = 2
}
