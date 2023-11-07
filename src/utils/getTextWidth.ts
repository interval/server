// based on https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript
function getStyle(element: HTMLElement, prop: string) {
  return window.getComputedStyle(element, null).getPropertyValue(prop)
}

function getCanvasFontSize(el = document.body) {
  const fontWeight = getStyle(el, 'font-weight') || 'normal'
  const fontSize = getStyle(el, 'font-size') || '16px'
  const fontFamily = getStyle(el, 'font-family') || 'Helvetica'

  return `${fontWeight} ${fontSize} ${fontFamily}`
}

export default function getTextWidth(text: string, el?: HTMLElement) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return 0
  context.font = getCanvasFontSize(el || document.body)
  const metrics = context.measureText(text)
  return metrics.width
}
