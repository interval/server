import main, { localConfig } from './main/host'

export const versions = {
  main,
}

export const localConfigs = {
  main: localConfig,
}

export { main }

export default async function setupHost() {
  const { SDK_VERSION = 'main' } = process.env

  return versions[SDK_VERSION]()
}

export function getLocalConfig() {
  const { SDK_VERSION = 'main' } = process.env

  return localConfigs[SDK_VERSION]
}
