import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody } from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/kbd'

const GROUPS = [
  {
    title: 'Général',
    items: [
      { keys: ['⌘', 'K'], label: 'Palette de commandes' },
      { keys: ['N'], label: 'Créer / capturer (via la palette)' },
      { keys: ['?'], label: 'Afficher cette aide' },
      { keys: ['Esc'], label: 'Fermer la fenêtre active' },
    ],
  },
  {
    title: 'Navigation — appuyer sur G puis…',
    items: [
      { keys: ['G', 'J'], label: 'Journée' },
      { keys: ['G', 'I'], label: 'Inbox' },
      { keys: ['G', 'C'], label: 'Calendrier' },
      { keys: ['G', 'T'], label: 'Tâches' },
      { keys: ['G', 'S'], label: 'Sessions' },
      { keys: ['G', 'P'], label: 'Projets' },
      { keys: ['G', 'U'], label: 'Espace Clients' },
      { keys: ['G', 'R'], label: 'Hub Ressources' },
      { keys: ['G', 'F'], label: 'Formation' },
    ],
  },
  {
    title: 'Quick-add (palette)',
    items: [
      { keys: ['#'], label: 'Assigner un projet — #ulycom' },
      { keys: ['!'], label: 'Impact — !haute, !basse, !80' },
      { keys: ['📅'], label: 'Date — demain, vendredi, 12/08, dans 3 jours' },
    ],
  },
]

export default function ShortcutsDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Raccourcis clavier</DialogTitle>
          <DialogDescription>Tout le Cockpit se pilote sans souris.</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-5">
          {GROUPS.map(group => (
            <div key={group.title}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                {group.title}
              </p>
              <div className="flex flex-col">
                {group.items.map(item => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-[var(--text-secondary)] odd:bg-[rgba(var(--ink),0.025)]"
                  >
                    <span>{item.label}</span>
                    <span className="flex items-center gap-1">
                      {item.keys.map((k, i) => (
                        <Kbd key={i}>{k}</Kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
