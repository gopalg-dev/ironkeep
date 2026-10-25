const { withDangerousMod } = require('expo/config-plugins')
const fs = require('node:fs/promises')
const path = require('node:path')

/** Bundle the Fold artwork used by the local active-workout notification. */
module.exports = (config) =>
  withDangerousMod(config, [
    'android',
    async (config) => {
      const { projectRoot, platformProjectRoot } = config.modRequest
      const resources = path.join(platformProjectRoot, 'app/src/main/res')
      for (const density of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
        const folder = `drawable-${density}`
        await fs.mkdir(path.join(resources, folder), { recursive: true })
        await fs.copyFile(
          path.join(projectRoot, 'assets/branding/fold/android', folder, 'ic_notification.png'),
          path.join(resources, folder, 'ic_notification.png'),
        )
      }
      // The local module resolves this app-owned drawable by name; keep it through resource shrinking.
      await fs.mkdir(path.join(resources, 'raw'), { recursive: true })
      await fs.writeFile(
        path.join(resources, 'raw/keep_branding.xml'),
        '<resources xmlns:tools="http://schemas.android.com/tools" tools:keep="@drawable/ic_notification"/>\n',
      )
      return config
    },
  ])
