const tsconfigPaths = require('vite-tsconfig-paths').default
const { mergeConfig } = require('vite')
const nodeResolve = require('@rollup/plugin-node-resolve')

/** @type {import('@storybook/core-common').StorybookConfig} */
module.exports = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    {
      name: '@storybook/addon-postcss',
      options: {
        postcssLoaderOptions: {
          implementation: require('postcss'),
        },
      },
    },
  ],
  viteFinal: async config => {
    return mergeConfig(config, {
      plugins: [nodeResolve(), tsconfigPaths()],
      optimizeDeps: {
        exclude: ['node-datachannel'],
      },
    })
  },
  framework: {
    name: '@storybook/react-vite',
    options: {
      fastRefresh: true,
      builder: {
        sourcemap: false,
      },
    },
  },
  // typescript: {
  //   // reactDocgen auto-generates documentation but dramatically slows down hot reloading, so it is disabled.
  //   reactDocgen: 'none',
  // },
  docs: {
    autodocs: false,
  },
}
