import { Search } from 'lucide-react'
import { Input } from './input'

/**
 * GlowSearchBar — désormais un simple champ de recherche shadcn (Input + icône).
 * API historique conservée ({ value, onChange, placeholder }) pour ne pas toucher
 * les vues qui l'utilisent.
 */
export default function GlowSearchBar({ value, onChange, placeholder = 'Rechercher...' }) {
  return (
    <div className="relative">
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
      />
      <Input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  )
}
