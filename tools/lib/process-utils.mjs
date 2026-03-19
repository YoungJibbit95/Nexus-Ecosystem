import { spawn, spawnSync } from 'node:child_process'

const IS_WINDOWS = process.platform === 'win32'
const NPM_EXEC_PATH = typeof process.env.npm_execpath === 'string'
  && process.env.npm_execpath.toLowerCase().includes('npm-cli.js')
  ? process.env.npm_execpath
  : null

const shouldUseShellOnWindows = (command, explicitShell) => {
  if (!IS_WINDOWS) return explicitShell
  if (typeof explicitShell === 'boolean') return explicitShell

  const raw = String(command || '').trim().toLowerCase()
  if (!raw) return false

  return raw === 'npm' || raw.endsWith('.cmd') || raw.endsWith('.bat')
}

const withPlatformDefaults = (command, options = {}) => {
  const finalOptions = { ...options }

  if (finalOptions.windowsHide === undefined) {
    finalOptions.windowsHide = true
  }

  const shell = shouldUseShellOnWindows(command, finalOptions.shell)
  if (typeof shell === 'boolean') {
    finalOptions.shell = shell
  }

  return finalOptions
}

const spawnSyncWithWindowsFallback = (command, args, options) => {
  let result = spawnSync(command, args, options)

  if (
    IS_WINDOWS
    && result?.error?.code === 'EINVAL'
    && options.shell !== true
  ) {
    result = spawnSync(command, args, { ...options, shell: true })
  }

  return result
}

const resolveNpmInvocation = (args = []) => {
  if (NPM_EXEC_PATH) {
    return {
      command: process.execPath,
      args: [NPM_EXEC_PATH, ...args],
      shell: false,
    }
  }

  return {
    command: 'npm',
    args,
    shell: IS_WINDOWS,
  }
}

export const spawnProcess = (command, args = [], options = {}) =>
  spawn(command, args, withPlatformDefaults(command, options))

export const spawnProcessSync = (command, args = [], options = {}) => {
  const finalOptions = withPlatformDefaults(command, options)
  return spawnSyncWithWindowsFallback(command, args, finalOptions)
}

export const spawnNpm = (args = [], options = {}) => {
  const invocation = resolveNpmInvocation(args)
  const finalOptions = withPlatformDefaults(invocation.command, options)

  if (typeof options.shell !== 'boolean') {
    finalOptions.shell = invocation.shell
  }

  return spawn(invocation.command, invocation.args, finalOptions)
}

export const spawnNpmSync = (args = [], options = {}) => {
  const invocation = resolveNpmInvocation(args)
  const finalOptions = withPlatformDefaults(invocation.command, options)

  if (typeof options.shell !== 'boolean') {
    finalOptions.shell = invocation.shell
  }

  return spawnSyncWithWindowsFallback(invocation.command, invocation.args, finalOptions)
}
