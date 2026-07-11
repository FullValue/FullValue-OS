#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "=== Stage des fichiers ==="
git add \
  src/views/shared/taskColors.js \
  src/views/TrelloCardsView.jsx \
  src/views/shared/TaskDetailModal.jsx \
  src/views/shared/TaskCard.jsx \
  src/components/import/BulkImportInterface.jsx \
  src/components/views/ClientSpace.jsx \
  src/hooks/useBulkImport.js \
  src/components/inputs/ImageOrFileInput.jsx \
  src/lib/import/schema.js \
  vercel.json

echo "=== Commit ==="
git commit -m "Fix circular dep and add Vercel routing

- Extract TAG_PALETTE/getTagColor/computeProgress to shared/taskColors.js
  to break circular import TrelloCardsView<->TaskDetailModal (was causing build hang)
- Add vercel.json SPA rewrite rule for client-side routing
- BulkImportInterface: defaultClientId + contextLabel props
- ClientSpace: Import bulk button in header
- useBulkImport: fallbackClientId, normalizeCardColor, checklist UUIDs
- Schema: card_color, checklist, inline_note, progress_percentage fields
- New ImageOrFileInput component with Supabase Storage upload

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

echo "=== Push vers GitHub ==="
git push origin main

echo ""
echo "✓ Pushed! Vercel va déployer automatiquement."
echo "  → Vérifie le déploiement sur https://vercel.com/dashboard"
