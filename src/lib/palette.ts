// A rotating set of accent colors so each bank card is easy to tell apart
// at a glance. Cash always uses its own fixed color (below) since it's a
// different kind of card, not just another bank.
export interface CardPalette {
  /** Left accent stripe + card top border */
  accentBorder: string
  /** Bank/card name heading text color */
  heading: string
  /** Subtotal badge background */
  badgeBg: string
  /** Subtotal badge text */
  badgeText: string
}

export const BANK_PALETTE: CardPalette[] = [
  {
    accentBorder: 'border-t-blue-500 dark:border-t-blue-400',
    heading: 'text-blue-700 dark:text-blue-300',
    badgeBg: 'bg-blue-100 dark:bg-blue-500/15',
    badgeText: 'text-blue-700 dark:text-blue-300',
  },
  {
    accentBorder: 'border-t-violet-500 dark:border-t-violet-400',
    heading: 'text-violet-700 dark:text-violet-300',
    badgeBg: 'bg-violet-100 dark:bg-violet-500/15',
    badgeText: 'text-violet-700 dark:text-violet-300',
  },
  {
    accentBorder: 'border-t-amber-500 dark:border-t-amber-400',
    heading: 'text-amber-700 dark:text-amber-300',
    badgeBg: 'bg-amber-100 dark:bg-amber-500/15',
    badgeText: 'text-amber-700 dark:text-amber-300',
  },
  {
    accentBorder: 'border-t-rose-500 dark:border-t-rose-400',
    heading: 'text-rose-700 dark:text-rose-300',
    badgeBg: 'bg-rose-100 dark:bg-rose-500/15',
    badgeText: 'text-rose-700 dark:text-rose-300',
  },
  {
    accentBorder: 'border-t-cyan-500 dark:border-t-cyan-400',
    heading: 'text-cyan-700 dark:text-cyan-300',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-500/15',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
  },
  {
    accentBorder: 'border-t-fuchsia-500 dark:border-t-fuchsia-400',
    heading: 'text-fuchsia-700 dark:text-fuchsia-300',
    badgeBg: 'bg-fuchsia-100 dark:bg-fuchsia-500/15',
    badgeText: 'text-fuchsia-700 dark:text-fuchsia-300',
  },
  {
    accentBorder: 'border-t-orange-500 dark:border-t-orange-400',
    heading: 'text-orange-700 dark:text-orange-300',
    badgeBg: 'bg-orange-100 dark:bg-orange-500/15',
    badgeText: 'text-orange-700 dark:text-orange-300',
  },
  {
    accentBorder: 'border-t-teal-500 dark:border-t-teal-400',
    heading: 'text-teal-700 dark:text-teal-300',
    badgeBg: 'bg-teal-100 dark:bg-teal-500/15',
    badgeText: 'text-teal-700 dark:text-teal-300',
  },
]

export const CASH_PALETTE: CardPalette = {
  accentBorder: 'border-t-emerald-500 dark:border-t-emerald-400',
  heading: 'text-emerald-700 dark:text-emerald-300',
  badgeBg: 'bg-emerald-100 dark:bg-emerald-500/15',
  badgeText: 'text-emerald-700 dark:text-emerald-300',
}

export function paletteFor(colorIndex: number): CardPalette {
  return BANK_PALETTE[colorIndex % BANK_PALETTE.length]
}
