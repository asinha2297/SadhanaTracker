import { animate } from 'motion/react'
import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '../lib/motion'

export function AnimatedNumber({ value }: { value: number }) {
  const reduced = usePrefersReducedMotion()
  const [shown, setShown] = useState(reduced ? value : 0)

  useEffect(() => {
    if (reduced) {
      setShown(value)
      return
    }
    const controls = animate(shown, value, {
      type: 'spring',
      stiffness: 90,
      damping: 20,
      onUpdate: (latest) => setShown(Math.round(latest)),
    })
    return () => controls.stop()
  }, [value, reduced])

  return <>{shown}</>
}
