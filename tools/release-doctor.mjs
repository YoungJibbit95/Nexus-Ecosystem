import { spawnSync } from 'node:child_process'
import { constants as fsConstants } from 'node:fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const args = process.argv.slice(2)
const hasArg = (name) => args.includes(name)
const readArg = (name) => {
  const index = args.indexOf(name)
  if (index < 0) return ''
  return String(args[index + 1] || '').trim()
}

const requireHostedUi = hasArg('--hosted-ui')
const requireNotarization = hasArg('--require-notarization')
const apiUrlInput = readArg('--api-url')
  || String(process.env.NEXUS_CONTROL_PUBLIC_API_URL || '').trim()
  || 'https://nexus-api.dev'

const checks = []
const pushCheck = (status, title, details) => checks.push({ status, title, details })

const exists = async (target) => {
  try {
    await fs.access(target, fsConstants.F_OK)
    return true
  } catch {
    return false
  }
}

const normalizeUrl = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    const parsed = new URL(raw)
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return ''
    const pathname = parsed.pathname === '/' ? '' : parsed.pathname
    return `${parsed.protocol}//${parsed.host}${pathname}`.replace(/\/$/, '')
  } catch {
    return ''
  }
}

const isLoopbackHost = (host) => {
  const value = String(host || '').trim().toLowerCase()
  return value === 'localhost' || value === '127.0.0.1' || value === '[::1]'
}

const withTimeout = async (url, timeoutMs = 8_000) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

const unescapeGradlePath = (value) => String(value || '')
  .replace(/\\:/g, ':')
  .replace(/\\\\/g, '\\')

const resolveSdkFromLocalProperties = async (androidRoot) => {
  const localProperties = path.join(androidRoot, 'local.properties')
  if (!(await exists(localProperties))) return null
  try {
    const raw = await fs.readFile(localProperties, 'utf8')
    const match = raw.match(/^\s*sdk\.dir\s*=\s*(.+)\s*$/m)
    if (!match) return null
    const sdkPath = unescapeGradlePath(match[1])
    return sdkPath ? path.resolve(sdkPath) : null
  } catch {
    return null
  }
}

const resolveAndroidSdkPath = async (appRoot) => {
  const candidates = []
  const addCandidate = (value) => {
    const normalized = String(value || '').trim()
    if (!normalized) return
    candidates.push(path.resolve(normalized))
  }

  addCandidate(process.env.ANDROID_HOME)
  addCandidate(process.env.ANDROID_SDK_ROOT)

  const androidRoot = path.join(appRoot, 'android')
  const fromLocalProps = await resolveSdkFromLocalProperties(androidRoot)
  addCandidate(fromLocalProps)

  const home = process.env.HOME || process.env.USERPROFILE || ''
  if (home) {
    addCandidate(path.join(home, 'Library', 'Android', 'sdk'))
    addCandidate(path.join(home, 'Android', 'Sdk'))
    addCandidate(path.join(home, 'AppData', 'Local', 'Android', 'Sdk'))
  }

  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate
  }

  return null
}

const resolveJava21Home = async () => {
  const candidates = []
  const addCandidate = (value) => {
    const normalized = String(value || '').trim()
    if (!normalized) return
    candidates.push(path.resolve(normalized))
  }

  addCandidate(process.env.JAVA_HOME)
  addCandidate('/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home')
  addCandidate('/Library/Java/JavaVirtualMachines/openjdk-21.jdk/Contents/Home')
  addCandidate('/usr/lib/jvm/java-21-openjdk')
  addCandidate('/usr/lib/jvm/jdk-21')
  addCandidate('/usr/lib/jvm/temurin-21-jdk')

  for (const candidate of candidates) {
    const javac = path.join(candidate, 'bin', process.platform === 'win32' ? 'javac.exe' : 'javac')
    if (await exists(javac)) return candidate
  }

  return null
}

const checkHostedControlApi = async () => {
  const normalized = normalizeUrl(apiUrlInput)
  if (!normalized) {
    const message = '--api-url bzw. NEXUS_CONTROL_PUBLIC_API_URL fehlt oder ist ungueltig.'
    if (requireHostedUi) {
      pushCheck('FAIL', 'Hosted Control API URL', `${message} Setze eine oeffentliche HTTPS URL deiner API.`)
    } else {
      pushCheck('WARN', 'Hosted Control API URL', `${message} Optional fuer lokale Entwicklung, Pflicht fuer gehostete Control UI.`)
    }
    return
  }

  const parsed = new URL(normalized)
  if (isLoopbackHost(parsed.hostname)) {
    pushCheck('FAIL', 'Hosted Control API URL', `Loopback URL erkannt (${normalized}). Fuer gehostete UI muss die API oeffentlich erreichbar sein.`)
    return
  }

  if (parsed.protocol !== 'https:') {
    pushCheck('FAIL', 'Hosted Control API URL', `Nicht-HTTPS URL erkannt (${normalized}). Gehostete UIs benoetigen HTTPS API Endpunkt.`)
    return
  }

  try {
    const bootstrapRes = await withTimeout(`${normalized}/api/v1/public/bootstrap`)
    if (!bootstrapRes.ok) {
      pushCheck('FAIL', 'Hosted Control API Bootstrap', `GET /api/v1/public/bootstrap liefert HTTP ${bootstrapRes.status}.`)
      return
    }

    const bootstrap = await bootstrapRes.json().catch(() => null)
    const service = bootstrap?.item?.service || 'unknown'
    const originTrusted = bootstrap?.item?.originTrusted
    const trustedOriginsCount = bootstrap?.item?.trustedOriginsCount
    pushCheck(
      'PASS',
      'Hosted Control API Bootstrap',
      `API erreichbar (${normalized}), service=${service}, originTrusted=${String(originTrusted)}, trustedOrigins=${String(trustedOriginsCount)}.`,
    )
  } catch (error) {
    pushCheck('FAIL', 'Hosted Control API Bootstrap', `Request fehlgeschlagen: ${error.message || error}`)
    return
  }

  try {
    const healthRes = await withTimeout(`${normalized}/health`)
    if (!healthRes.ok) {
      pushCheck('WARN', 'Hosted Control API Health', `GET /health liefert HTTP ${healthRes.status}.`)
      return
    }
    pushCheck('PASS', 'Hosted Control API Health', 'Health Endpoint ist erreichbar.')
  } catch (error) {
    pushCheck('WARN', 'Hosted Control API Health', `Health Request fehlgeschlagen: ${error.message || error}`)
  }
}

const checkAndroid = async () => {
  const apps = [
    { name: 'Nexus Mobile', root: path.join(ROOT, 'Nexus Mobile') },
    { name: 'Nexus Code Mobile', root: path.join(ROOT, 'Nexus Code Mobile') },
  ]

  for (const app of apps) {
    const sdkPath = await resolveAndroidSdkPath(app.root)
    if (!sdkPath) {
      pushCheck('FAIL', `${app.name} Android SDK`, 'Kein Android SDK gefunden (env/local.properties/Standardpfade).')
      continue
    }

    const adb = path.join(sdkPath, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb')
    const hasAdb = await exists(adb)
    if (!hasAdb) {
      pushCheck('WARN', `${app.name} Android SDK`, `SDK gefunden (${sdkPath}), aber adb fehlt unter platform-tools.`)
      continue
    }

    pushCheck('PASS', `${app.name} Android SDK`, `SDK aktiv: ${sdkPath}`)
  }

  const java21Home = await resolveJava21Home()
  if (!java21Home) {
    pushCheck('FAIL', 'Android Java Toolchain (JDK 21)', 'JDK 21 nicht gefunden. Nexus Code Mobile Gradle Build benoetigt Java 21.')
  } else {
    pushCheck('PASS', 'Android Java Toolchain (JDK 21)', `JAVA_HOME Kandidat: ${java21Home}`)
  }
}

const checkNotarization = async () => {
  const required = ['APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID']
  const missing = required.filter((name) => !String(process.env[name] || '').trim())

  if (missing.length > 0) {
    const message = `Fehlende Env Variablen: ${missing.join(', ')}.`
    if (requireNotarization) {
      pushCheck('FAIL', 'macOS Notarization Env', message)
    } else {
      pushCheck('WARN', 'macOS Notarization Env', `${message} Ohne diese Variablen wird Notarization uebersprungen.`)
    }
  } else {
    pushCheck('PASS', 'macOS Notarization Env', 'Notarization-Variablen gesetzt.')
  }

  const notaryTool = spawnSync('xcrun', ['notarytool', '--version'], {
    stdio: 'pipe',
    encoding: 'utf8',
  })

  if (notaryTool.status === 0) {
    pushCheck('PASS', 'xcrun notarytool', (notaryTool.stdout || '').trim() || 'notarytool verfuegbar')
  } else {
    const details = (notaryTool.stderr || notaryTool.error?.message || 'notarytool nicht verfuegbar').trim()
    if (requireNotarization) {
      pushCheck('FAIL', 'xcrun notarytool', details)
    } else {
      pushCheck('WARN', 'xcrun notarytool', details)
    }
  }
}

const printResults = () => {
  const icon = {
    PASS: 'PASS',
    WARN: 'WARN',
    FAIL: 'FAIL',
  }

  for (const check of checks) {
    console.log(`[${icon[check.status]}] ${check.title}`)
    if (check.details) {
      console.log(`       -> ${check.details}`)
    }
  }

  const pass = checks.filter((item) => item.status === 'PASS').length
  const warn = checks.filter((item) => item.status === 'WARN').length
  const fail = checks.filter((item) => item.status === 'FAIL').length
  console.log(`\nRelease Doctor: ${pass} PASS, ${warn} WARN, ${fail} FAIL`)
  return fail
}

const main = async () => {
  console.log('Nexus Release Doctor')
  console.log('====================')
  await checkHostedControlApi()
  await checkAndroid()
  await checkNotarization()
  const failCount = printResults()

  if (failCount > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(`[release-doctor] Fehler: ${error.message || error}`)
  process.exit(1)
})
