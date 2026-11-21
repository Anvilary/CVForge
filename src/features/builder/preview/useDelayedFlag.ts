import { useEffect, useState } from 'react'

// True only after `flag` has stayed true for `delayMs`. A status that would
// flash for a frame on every fast update is never shown at all.
export function useDelayedFlag(flag: boolean, delayMs: number): boolean {
  const [elapsed, setElapsed] = useState(false)
  useEffect(() => {
    if (!flag) {
      setElapsed(false)
      return
    }
    const timer = setTimeout(() => setElapsed(true), delayMs)
    return () => clearTimeout(timer)
  }, [flag, delayMs])
  return flag && elapsed
}
