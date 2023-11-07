// Workaround to allow importing JSON files outside of rootDir
// https://stackoverflow.com/a/61426303
declare module '*.json' {
  export const name: string
  export const version: string
}
