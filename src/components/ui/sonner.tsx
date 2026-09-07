import { useEffect, useState, type CSSProperties } from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { getInitialTheme, watchSystemTheme } from '@/lib/theme'

const Toaster = ({ ...props }: ToasterProps) => {
  const [theme, setTheme] = useState(getInitialTheme)

  // Also the one place that keeps <html class="dark"> itself in sync if
  // the OS preference changes while the page is open - see watchSystemTheme().
  useEffect(() => watchSystemTheme(setTheme), [])

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      richColors
      closeButton
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
