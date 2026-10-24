/**
 * Checks the release APKs against docs/00-requirements.md section 8b: no INTERNET permission, one APK
 * per ABI, and APK size reporting. Run after `cd android && ./gradlew assembleRelease`.
 */
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { $ } from 'bun'

const OUT = 'android/app/build/outputs/apk/release'

const sdk =
  process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT ?? join(process.env.LOCALAPPDATA ?? '', 'Android/Sdk')
const buildTools = readdirSync(join(sdk, 'build-tools')).sort().at(-1)
if (!buildTools) throw new Error(`No build-tools under ${sdk}`)
const aapt = join(sdk, 'build-tools', buildTools, 'aapt')

const apks = readdirSync(OUT).filter((name) => name.endsWith('.apk'))
if (apks.length === 0) throw new Error(`No APK in ${OUT}; build with: cd android && ./gradlew assembleRelease`)

let failed = false
for (const name of apks) {
  const file = join(OUT, name)
  const mb = statSync(file).size / 1024 / 1024
  const permissions = (await $`${aapt} dump permissions ${file}`.text())
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('uses-permission'))
    .map((line) => line.replace(/^uses-permission: name='([^']+)'.*$/, '$1'))
  const internet = permissions.some((p) => p.endsWith('.INTERNET'))
  if (internet) failed = true
  console.log(`${name}: ${mb.toFixed(1)} MB`)
  console.log(`  permissions: ${permissions.join(', ') || 'none'}${internet ? '  <- INTERNET must not be here' : ''}`)
}
if (!apks.some((name) => name.includes('arm64'))) {
  console.error('No arm64 APK: ABI splits are not in effect')
  failed = true
}
process.exit(failed ? 1 : 0)
