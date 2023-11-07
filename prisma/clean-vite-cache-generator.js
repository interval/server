#!/usr/bin/env node
/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('fs')
const path = require('path')
const { generatorHandler } = require('@prisma/generator-helper')

generatorHandler({
  onManifest() {
    return {
      defaultOutput: 'node_modules/.vite',
    }
  },
  async onGenerate() {
    const viteDir = path.resolve(__dirname, '../node_modules/.vite')
    const viteConfig = path.resolve(__dirname, '../vite.config.ts')
    try {
      fs.rmdirSync(viteDir, { recursive: true })

      console.info(
        '🚮 Vite cache has been cleared, restarting vite server if running...'
      )

      // `touch` vite config so the running server reloads
      const now = new Date()
      fs.utimesSync(viteConfig, now, now)
    } catch (err) {
      if (err.code !== 'ENOENT') {
        // Something went wrong
        console.info(
          'There was a problem deleting the Vite cache, please remove it manually with `yarn client:clean`'
        )
        console.error(err)
      }

      // Cache didn't exist, no problem
    }
  },
})
