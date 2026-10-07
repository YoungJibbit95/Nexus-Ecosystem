import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import { androidBundleName, signAndroidBundle, validateAndroidBundle } from './lib/android-bundle.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { values, positionals } = parseArgs({ allowPositionals: true, options: {
  app: { type: 'string' }, input: { type: 'string' }, directory: { type: 'string' },
  output: { type: 'string' }, scratch: { type: 'string' }, signed: { type: 'boolean', default: false },
} })
const [command] = positionals
if (positionals.length !== 1 || !['prepare', 'validate', 'validate-data', 'sign'].includes(command)) throw new Error('Unsupported Android bundle command')
const javaHome = process.env.JAVA_HOME
const scratchRoot = values.scratch || process.env.RUNNER_TEMP
const newOutput = () => {
  const output = path.resolve(values.output), parent = fs.realpathSync(path.dirname(output))
  if (fs.existsSync(output) || parent === repoRoot || parent.startsWith(repoRoot + path.sep)) throw new Error('Bundle output must be new and outside the checkout')
  fs.mkdirSync(output)
  return output
}
const candidate = command === 'sign' ? false : values.signed
const name = androidBundleName(values.app, candidate)
if (command === 'prepare') {
  if (values.signed) throw new Error('Preparation accepts only unsigned candidates')
  validateAndroidBundle({ file: values.input, javaHome, scratchRoot })
  fs.copyFileSync(values.input, path.join(newOutput(), name), fs.constants.COPYFILE_EXCL)
} else {
  const directory = path.resolve(values.directory), stat = fs.lstatSync(directory)
  if (!stat.isDirectory() || stat.isSymbolicLink() || JSON.stringify(fs.readdirSync(directory)) !== JSON.stringify([name])) throw new Error('Unexpected Android artifact contents')
  const file = path.join(directory, name), fileStat = fs.lstatSync(file)
  if (!fileStat.isFile() || fileStat.isSymbolicLink() || fileStat.size === 0 || fileStat.size > 512 * 1024 * 1024) throw new Error('Unsafe Android bundle file')
  if (command === 'sign') signAndroidBundle({ input: file, output: path.join(newOutput(), androidBundleName(values.app, true)), javaHome, scratchRoot })
  else if (command === 'validate') validateAndroidBundle({ file, signed: values.signed, javaHome, scratchRoot })
  // validate-data deliberately checks the flat handoff only. Native trust was
  // verified in the fresh protected signer; this job receives immutable data.
}
