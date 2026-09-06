import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

const SHOW_AFTER_PX = 400

// Deliberately plain names throughout (no "track"/"analytics"/etc.) -
// some ad/content blockers filter on those substrings in script and
// element identifiers, which could otherwise silently strip this out.
export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > SHOW_AFTER_PX)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!visible) return null

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      title="Back to top"
      className="animate-in fade-in-0 zoom-in-95 fixed right-4 bottom-4 z-40 rounded-full shadow-md sm:right-6 sm:bottom-6"
    >
      <ArrowUp className="size-4" />
    </Button>
  )
}
