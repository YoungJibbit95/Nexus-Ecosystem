import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'

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

// Node surrounds cmd's entire shell command with quotes. A literal batch path
// containing whitespace needs its own inner boundary; keep argv behavior intact.
const quoteWindowsBatchPath = (command, options, requestedShell = options.shell) =>
  IS_WINDOWS && options.shell === true && typeof requestedShell !== 'string'
    && path.isAbsolute(command) && /\.(?:cmd|bat)$/i.test(command)
    && /\s/.test(command) && !command.includes('"')
    ? `"${command}"`
    : command

const spawnSyncWithWindowsFallback = (command, args, options, requestedShell = options.shell) => {
  let result = spawnSync(quoteWindowsBatchPath(command, options, requestedShell), args, options)

  if (
    IS_WINDOWS
    && result?.error?.code === 'EINVAL'
    && options.shell !== true
  ) {
    const fallbackOptions = { ...options, shell: true }
    result = spawnSync(quoteWindowsBatchPath(command, fallbackOptions, requestedShell), args, fallbackOptions)
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

export const spawnProcess = (command, args = [], options = {}) => {
  const finalOptions = withPlatformDefaults(command, options)
  return spawn(quoteWindowsBatchPath(command, finalOptions, options.shell), args, finalOptions)
}

export const spawnProcessSync = (command, args = [], options = {}) => {
  const finalOptions = withPlatformDefaults(command, options)
  return spawnSyncWithWindowsFallback(command, args, finalOptions, options.shell)
}

export const spawnNpm = (args = [], options = {}) => {
  const invocation = resolveNpmInvocation(args)
  const finalOptions = withPlatformDefaults(invocation.command, options)

  if (typeof options.shell !== 'boolean') {
    finalOptions.shell = invocation.shell
  }

  return spawn(quoteWindowsBatchPath(invocation.command, finalOptions, options.shell), invocation.args, finalOptions)
}

export const spawnNpmSync = (args = [], options = {}) => {
  const invocation = resolveNpmInvocation(args)
  const finalOptions = withPlatformDefaults(invocation.command, options)

  if (typeof options.shell !== 'boolean') {
    finalOptions.shell = invocation.shell
  }

  return spawnSyncWithWindowsFallback(invocation.command, invocation.args, finalOptions, options.shell)
}
