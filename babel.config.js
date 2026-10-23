module.exports = (api) => {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    // Drizzle's generated .sql migrations are bundled as strings.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  }
}
