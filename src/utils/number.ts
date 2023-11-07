import { ImageSize } from '@interval/sdk/dist/ioSchema'

// Keep in sync with tailwind.config.js
export function imageSizeToPx(
  imageSize: ImageSize,
  context?: 'dropdown'
): number {
  if (context === 'dropdown') {
    switch (imageSize) {
      case 'thumbnail':
        return 32
      case 'small':
        return 48
      case 'medium':
        return 80
      case 'large':
        return 128
    }
  }

  switch (imageSize) {
    case 'thumbnail':
      return 64
    case 'small':
      return 128
    case 'medium':
      return 256
    case 'large':
      return 512
  }
}
