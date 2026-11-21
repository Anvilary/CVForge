import { useState, useEffect } from 'react'

function getDevicePixelRatio() {
  return typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
}

export function useDevicePixelRatio() {
  const [dpr, setDpr] = useState(() => getDevicePixelRatio())
  useEffect(() => {
    const mql = window.matchMedia(`(resolution: ${dpr}dppx)`)
    const handler = () => setDpr(getDevicePixelRatio())
    mql.addEventListener('change', handler)
    // Some engines change the pixel ratio (browser zoom, display change) with
    // a resize but without a resolution media query event.
    window.addEventListener('resize', handler)
    return () => {
      mql.removeEventListener('change', handler)
      window.removeEventListener('resize', handler)
    }
  }, [dpr])
  return dpr
}
