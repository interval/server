/* eslint-env node */

/** @type {import('@svgr/core').Config} */
module.exports = {
  svgoConfig: {
    plugins: ['removeDimensions'],
  },
  template: require('./src/icons/svgr-template.js'),
  typescript: true,
  expandProps: true,
  replaceAttrValues: {
    black: 'currentColor',
    '#000': 'currentColor',
    '#000000': 'currentColor',
  },
  outDir: 'src/icons/compiled',
}
