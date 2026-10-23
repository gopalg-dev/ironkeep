const { withAppBuildGradle, withDangerousMod } = require('expo/config-plugins')
const fs = require('node:fs/promises')
const path = require('node:path')

/**
 * Release rules from docs/00-requirements.md section 8b, applied at prebuild:
 *
 * 1. No network. `android.blockedPermissions` in app.json strips INTERNET (and the dev overlay's
 *    SYSTEM_ALERT_WINDOW) from every manifest. The debug build still needs them to reach Metro, so
 *    this mod adds them back to the debug source set only.
 * 2. One APK per ABI, no universal APK, so a phone downloads only its own native code.
 */
const DEBUG_PERMISSIONS = ['android.permission.INTERNET', 'android.permission.SYSTEM_ALERT_WINDOW']

const withDebugPermissions = (config) =>
  withDangerousMod(config, [
    'android',
    async (config) => {
      const file = path.join(config.modRequest.platformProjectRoot, 'app/src/debug/AndroidManifest.xml')
      let xml = await fs.readFile(file, 'utf8')
      for (const permission of DEBUG_PERMISSIONS) {
        if (xml.includes(permission)) continue
        xml = xml.replace('<application', `<uses-permission android:name="${permission}"/>\n\n    <application`)
      }
      await fs.writeFile(file, xml)
      return config
    },
  ])

const SPLITS = `
    splits {
        abi {
            enable true
            reset()
            include(*((findProperty('ironkeep.buildAbis') ?: 'arm64-v8a,armeabi-v7a').split(',')))
            universalApk false
        }
    }
`

const withAbiSplits = (config) =>
  withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('splits {')) {
      config.modResults.contents = config.modResults.contents.replace(/\nandroid \{\n/, `\nandroid {\n${SPLITS}`)
    }
    return config
  })

// The release APK's merged manifest is checked for INTERNET by `bun run release:check` (scripts/release-check.ts).
module.exports = (config) => withAbiSplits(withDebugPermissions(config))
