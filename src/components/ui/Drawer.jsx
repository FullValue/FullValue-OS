import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from './sheet'

/**
 * Drawer — désormais un simple wrapper autour du Sheet shadcn (Radix Dialog).
 * API historique conservée ({ isOpen, onClose, title, children }) pour ne pas
 * toucher les 8 vues qui l'utilisent. Radix gère overlay, Escape, scroll-lock et
 * le bouton de fermeture.
 */
export default function Drawer({ isOpen, onClose, title, children }) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose?.() }}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title || 'Détails'}</SheetTitle>
        </SheetHeader>
        <SheetBody>{children}</SheetBody>
      </SheetContent>
    </Sheet>
  )
}
