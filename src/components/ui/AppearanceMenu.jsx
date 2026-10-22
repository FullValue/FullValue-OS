import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'

const appearances = [
  { value: 'light', label: 'Clair', Icon: Sun },
  { value: 'dark', label: 'Sombre', Icon: Moon },
  { value: 'system', label: 'Système', Icon: Monitor },
]

export default function AppearanceMenu() {
  const { preference, theme, setThemePreference } = useTheme()
  const selected = appearances.find(option => option.value === preference)
  const Icon = selected.Icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="appearance-trigger h-9 gap-2" aria-label={`Apparence : ${selected.label}`}>
          <Icon size={15} aria-hidden="true" />
          <span className="hidden sm:inline">{selected.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuLabel>Apparence</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={preference} onValueChange={setThemePreference}>
          {appearances.map(({ value, label, Icon: OptionIcon }) => (
            <DropdownMenuRadioItem key={value} value={value} className="gap-2.5 py-2.5">
              <OptionIcon size={16} aria-hidden="true" />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <p className="px-2.5 py-2 text-xs leading-relaxed text-[var(--text-tertiary)]">
          {preference === 'system'
            ? `Suit votre appareil. Actuellement ${theme === 'dark' ? 'sombre' : 'clair'}.`
            : 'Choisissez Système pour suivre l’apparence de votre appareil.'}
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
