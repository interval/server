/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const tailwind = require('tailwindcss')
const autoprefixer = require('autoprefixer')
const tailwindConfig = require('./tailwind.config')

module.exports = {
  plugins: [
    require('postcss-import'),
    require('tailwindcss/nesting'),
    tailwind(tailwindConfig),
    autoprefixer,
  ],
}
