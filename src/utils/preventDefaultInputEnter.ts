export function preventDefaultInputEnterKey(event: React.KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
  }
}
