import { useState, useRef, useEffect } from 'react'

export default function useImageLoaded() {
  const [imageLoaded, setImageLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = imgRef.current

    if (!img) return

    const handleLoad = () => setImageLoaded(true)
    img.addEventListener('load', handleLoad)
    return () => img.removeEventListener('load', handleLoad)
  }, [])

  return { imageLoaded, imgRef }
}
