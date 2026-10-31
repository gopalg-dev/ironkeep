const { getDefaultConfig } = require('expo/metro-config')
const { withUniwindConfig } = require('uniwind/metro')

const config = getDefaultConfig(__dirname)

// Drizzle's generated migrations are .sql files, bundled through babel-plugin-inline-import.
config.resolver.sourceExts.push('sql')

module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
  dtsFile: './src/uniwind-types.d.ts',
  // The two themes the phone's colours are written onto at runtime (src/theme/look.ts).
  extraThemes: ['you-light', 'you-dark', 'latte', 'lime', 'dracula'],
})
