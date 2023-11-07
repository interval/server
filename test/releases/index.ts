import main, { localConfig } from './main/host'
import v1_1_0, { localConfig as v1_1_0_localConfig } from './1.1.0/host'
import v1_0_0, { localConfig as v1_0_0_localConfig } from './1.0.0/host'
import v0_37_0, { localConfig as v0_37_0_localConfig } from './0.37.0/host'
import v0_36_0, { localConfig as v0_36_0_localConfig } from './0.36.0/host'
import v0_35_0, { localConfig as v0_35_0_localConfig } from './0.35.0/host'
import v0_34_0, { localConfig as v0_34_0_localConfig } from './0.34.0/host'
import v0_33_0, { localConfig as v0_33_0_localConfig } from './0.33.0/host'
import v0_28_0, { localConfig as v0_28_0_localConfig } from './0.28.0/host'
import v0_17_0, { localConfig as v0_17_0_localConfig } from './0.17.0/host'

export const versions = {
  main,
  '1.1.0': v1_1_0,
  '1.0.0': v1_0_0,
  '0.37.0': v0_37_0,
  '0.36.0': v0_36_0,
  '0.35.0': v0_35_0,
  '0.34.0': v0_34_0,
  '0.33.0': v0_33_0,
  '0.28.0': v0_28_0,
  '0.17.0': v0_17_0,
}

export const localConfigs = {
  main: localConfig,
  '1.1.0': v1_1_0_localConfig,
  '1.0.0': v1_0_0_localConfig,
  '0.37.0': v0_37_0_localConfig,
  '0.36.0': v0_36_0_localConfig,
  '0.35.0': v0_35_0_localConfig,
  '0.34.0': v0_34_0_localConfig,
  '0.33.0': v0_33_0_localConfig,
  '0.28.0': v0_28_0_localConfig,
  '0.17.0': v0_17_0_localConfig,
}

export { main }

export default async function setupHost() {
  let { SDK_VERSION = 'main' } = process.env

  if (SDK_VERSION === 'latest') {
    SDK_VERSION = Object.keys(versions)[1]
    process.env.SDK_VERSION = SDK_VERSION
  }

  return versions[SDK_VERSION]()
}

export function getLocalConfig() {
  let { SDK_VERSION = 'main' } = process.env

  if (SDK_VERSION === 'latest') {
    SDK_VERSION = Object.keys(versions)[1]
    process.env.SDK_VERSION = SDK_VERSION
  }

  return localConfigs[SDK_VERSION]
}
