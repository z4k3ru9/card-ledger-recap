import { useEffect, useState, type CSSProperties } from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { getInitialTheme, onThemeChange } from '@/lib/theme'

const Toaster = ({ ...props }: ToasterProps) => {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => onThemeChange(setTheme), [])

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
