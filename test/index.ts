import child_process from 'child_process'
import { versions } from './releases'

function runAll() {
  let command = 'yarn test'
  // Allow passing runtime command-line arguments to below playwright call
  // eg `PLAYWRIGHT_ARGS='--workers 1' yarn test:all`
  const { PLAYWRIGHT_ARGS } = process.env
  if (PLAYWRIGHT_ARGS) {
    command += ` ${PLAYWRIGHT_ARGS}`
  }

  for (const version of Object.keys(versions)) {
    const commandString = `SDK_VERSION=${version} ${command}`

    console.log(`Running: ${commandString}`)
    child_process.execSync(command, {
      stdio: 'inherit',
      env: {
        // Necessary to use same `node` as current process, eg for nvm
        // Derived from https://github.com/yarnpkg/yarn/blob/6db39cf0ff684ce4e7de29669046afb8103fce3d/src/util/execute-lifecycle-script.js
        NODE: process.execPath,
        ...process.env,
        npm_node_execpath: process.env.NODE ?? process.execPath,
        SDK_VERSION: version,
      },
    })
  }
}

runAll()
