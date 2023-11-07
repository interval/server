export class IOComponentError extends Error {
  constructor(message?: string) {
    super(message ?? 'This field is required.')
  }
}
