import { useLayoutEffect, useRef } from 'react'

// Largest font size (between min and max, in px) at which the text element
// fits inside its container, recomputed when the text or container changes.
// Sentences range from a few words to 200+ characters and screens from
// landscape phones to desktops, so a fixed size can't work.
export function useFitText(text, { min = 18, max = 76 } = {}) {
  const containerRef = useRef(null)
  const textRef = useRef(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    const textElement = textRef.current

    if (!container || !textElement) {
      return undefined
    }

    function fits() {
      return (
        textElement.scrollHeight <= container.clientHeight &&
        textElement.scrollWidth <= container.clientWidth
      )
    }

    function fit() {
      let low = min
      let high = max

      // Binary search to the nearest pixel.
      while (high - low > 1) {
        const middle = Math.floor((low + high) / 2)
        textElement.style.fontSize = `${middle}px`

        if (fits()) {
          low = middle
        } else {
          high = middle
        }
      }

      textElement.style.fontSize = `${low}px`
    }

    fit()

    const resizeObserver = new ResizeObserver(fit)
    resizeObserver.observe(container)
    document.fonts?.ready.then(fit)

    return () => resizeObserver.disconnect()
  }, [text, min, max])

  return { containerRef, textRef }
}
