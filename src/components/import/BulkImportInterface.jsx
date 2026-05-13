import { useState, useEffect, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { BulkImportSchema, formatZodError } from '@/lib/import/schema'
import { useBulkImport, countEntities, normalizeSlug, ID_TO_SLUG } from '@/hooks/useBulkImport'
import { useStore } from '@/store/useStore'

// ─── Project label helpers ────────────────────────────────────────────────────

const SLUG_LABELS = { ulycom: 'Ulycom', yoovi: 'Yoovi', 'e-com': 'E-com', saas: 'SaaS' }
const SLUG_COLORS = { ulycom: '#A8E6BD', yoovi: '#8B7CFF', 'e-com': '#FFD66B', saas: '#FFB088' }

function ProjectBadge({ slug }) {
  if (!slug) return null
  const id = normalizeSlug(slug)
  const label = SLUG_LABELS[id] || slug
  const color = SLUG_COLORS[id] || '#A8A4A0'
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
      style={{ background: color + '20', color }}>
      {label}
    </span>
  )
}

// ─── Schema documentation modal ───────────────────────────────────────────────

const EXAMPLE_JSON = `{
  "project_slug": "yoovi",
  "tasks": [
    {
      "title": "Refondre la landing page",
      "description": "Focus sur la section hero et le CTA principal",
      "impact": "high",
      "due_date": "2026-05-20",
      "is_priority_today": true,
      "card_color": "violet",
      "inline_note": "Voir maquette Figma",
      "checklist": [
        { "label": "Rédiger le copy hero", "done": false },
        { "label": "Intégrer le CTA", "done": false },
        { "label": "Tests mobile", "done": false }
      ]
    },
    {
      "title": "Analyser les métriques onboarding",
      "project_slug": "yoovi",
      "status": "in_progress",
      "tags": ["analytics", "growth"]
    }
  ],
  "notes": [
    {
      "title": "Feedback call du 12/05",
      "content": "L'utilisateur A veut pouvoir exporter en PDF. L'utilisateur B bloqué sur l'étape 3.",
      "project_slug": "yoovi"
    }
  ],
  "appointments": [
    {
      "title": "Pitch investisseur",
      "starts_at": "2026-05-15T14:00:00",
      "duration_minutes": 60,
      "location": "Paris 9e"
    }
  ],
  "resources": [
    {
      "name": "Prompt analyse concurrents",
      "type": "prompt",
      "content": "Analyse les 5 principaux concurrents de [PRODUIT] sur ces axes : positionnement, pricing, acquisition, différenciation. Format tableau.",
      "category": "Stratégie"
    }
  ],
  "inbox_items": [
    { "content": "Tester le tunnel de paiement Stripe" },
    { "content": "Relancer Bastien sur le devis design" }
  ]
}`

const AI_PROMPT = `Tu es un assistant de productivité. L'utilisateur va te donner un brain dump (texte libre, liste, notes vocales retranscrites, etc.) et tu dois le structurer en JSON valide pour l'importer dans son outil de gestion Le Cockpit.

## Format JSON à produire

\`\`\`json
{
  "project_slug": "ulycom | yoovi | e-com | saas (optionnel, défaut si non précisé)",
  "tasks": [
    {
      "title": "string (REQUIS)",
      "description": "string (optionnel)",
      "project_slug": "ulycom | yoovi | e-com | saas (optionnel)",
      "impact": "high | low (optionnel)",
      "status": "todo | in_progress | done (défaut: todo)",
      "due_date": "YYYY-MM-DD (optionnel)",
      "estimated_minutes": 30,
      "ship_at_80": false,
      "tags": ["string"],
      "is_priority_today": false,
      "card_color": "violet | rose | orange | yellow | green | blue | red (optionnel)",
      "inline_note": "Note courte max 120 chars (optionnel)",
      "checklist": [{ "label": "string", "done": false }]
    }
  ],
  "notes": [
    {
      "title": "string (REQUIS)",
      "content": "string Markdown (REQUIS)",
      "project_slug": "optionnel"
    }
  ],
  "appointments": [
    {
      "title": "string (REQUIS)",
      "starts_at": "YYYY-MM-DDTHH:mm:ss (REQUIS)",
      "duration_minutes": 60,
      "description": "optionnel",
      "location": "optionnel"
    }
  ],
  "resources": [
    {
      "name": "string (REQUIS)",
      "type": "prompt | template | link",
      "content": "pour prompt et template",
      "url": "pour link",
      "category": "Stratégie | Tech | Marketing | Commercial | Design | Autre"
    }
  ],
  "inbox_items": [
    { "content": "string (REQUIS)" }
  ]
}
\`\`\`

## Règles

1. Identifie le projet concerné parmi : ulycom (agence), yoovi (SaaS), e-com (e-commerce), saas (autre SaaS)
2. Classe chaque élément dans le bon type : tâche actionnable → tasks, idée vague → inbox_items, réunion/call → appointments, prompt/template/lien → resources, note de synthèse → notes
3. Pour les dates, utilise le format ISO (YYYY-MM-DD). La date d'aujourd'hui est {{DATE}}.
4. Ne génère que du JSON valide, rien d'autre.
5. Si un champ optionnel n'est pas mentionné, ne l'inclus pas dans le JSON (ne pas mettre null).

## Brain dump de l'utilisateur

[COLLE TON TEXTE ICI]`

function SchemaModal({ onClose }) {
  const [tab, setTab] = useState('example')
  const [copied, setCopied] = useState(false)

  function copyPrompt() {
    const today = new Date().toISOString().slice(0, 10)
    navigator.clipboard.writeText(AI_PROMPT.replace('{{DATE}}', today))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-float)' }}>
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-soft)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Format JSON attendu</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 transition-colors" style={{ color: 'var(--text-tertiary)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-1 px-5 pt-3 flex-shrink-0">
          {[['example', 'Exemple'], ['prompt', 'Prompt IA']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className="px-3 py-1.5 text-xs rounded-lg transition-colors"
              style={tab === id
                ? { background: 'var(--violet-bg)', color: 'var(--violet-deep)', fontWeight: 500 }
                : { color: 'var(--text-tertiary)' }}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'example' && (
            <div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                Exemple de JSON valide avec toutes les sections. Tu peux copier-coller et adapter.
              </p>
              <pre className="text-xs leading-relaxed p-4 rounded-xl overflow-x-auto"
                style={{ background: 'var(--bg-input, rgba(0,0,0,0.15))', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', border: '1px solid var(--border-soft)' }}>
                {EXAMPLE_JSON}
              </pre>
            </div>
          )}

          {tab === 'prompt' && (
            <div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                Colle ce prompt dans ton GPT, ton Gem Gemini ou ton Claude Project. Il transforme n'importe quel brain dump en JSON importable.
              </p>
              <pre className="text-xs leading-relaxed p-4 rounded-xl overflow-x-auto whitespace-pre-wrap"
                style={{ background: 'var(--bg-input, rgba(0,0,0,0.15))', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', border: '1px solid var(--border-soft)' }}>
                {AI_PROMPT.replace('{{DATE}}', new Date().toISOString().slice(0, 10))}
              </pre>
              <button onClick={copyPrompt}
                className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'var(--violet-bg)', color: 'var(--violet-deep)' }}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copié !' : 'Copier le prompt'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Import Preview ───────────────────────────────────────────────────────────

const CARD_COLOR_DOT = {
  violet: '#8B7CFF', rose: '#FFC1E0', pink: '#FFC1E0', orange: '#FFB088',
  yellow: '#FFD66B', green: '#A8E6BD', blue: '#A8D4F0', red: '#F87171',
}

function TaskMeta({ item }) {
  const dots = []
  if (item.card_color) {
    const col = CARD_COLOR_DOT[item.card_color?.toLowerCase()] || item.card_color
    dots.push(<span key="color" title={`Couleur: ${item.card_color}`} style={{ width: 7, height: 7, borderRadius: '50%', background: col, display: 'inline-block', flexShrink: 0 }} />)
  }
  if (item.checklist?.length > 0) {
    dots.push(<span key="checklist" className="text-[9px]" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} title="Checklist">✓ {item.checklist.length}</span>)
  }
  if (item.inline_note) {
    dots.push(<span key="note" className="text-[9px]" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} title={item.inline_note}>💬</span>)
  }
  if (dots.length === 0) return null
  return <span className="flex items-center gap-1 flex-shrink-0">{dots}</span>
}

const TYPE_META = {
  tasks: {
    label: 'Tâches', icon: '✓',
    key: t => `task:${t.title}`,
    name: t => t.title,
    slug: t => t.project_slug,
    extra: t => <TaskMeta item={t} />,
  },
  notes: { label: 'Notes', icon: '📝', key: n => `note:${n.title}`, name: n => n.title, slug: n => n.project_slug, extra: null },
  appointments: { label: 'Rendez-vous', icon: '📅', key: a => `appointment:${a.title}`, name: a => `${a.title} · ${a.starts_at?.slice(0, 16).replace('T', ' ')}`, slug: a => a.project_slug, extra: null },
  resources: { label: 'Ressources', icon: '📎', key: r => `resource:${r.name}`, name: r => r.name, slug: r => r.project_slug, extra: null },
  inbox_items: { label: 'Inbox', icon: '📥', key: i => `inbox:${i.content.substring(0, 30)}`, name: i => i.content, slug: () => null, extra: null },
}

function ImportPreview({ data, excluded, onToggle, defaultProjectSlug }) {
  const [collapsed, setCollapsed] = useState({})
  const total = countEntities(data, excluded)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-soft)', background: 'var(--bg-surface)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-soft)' }}>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Aperçu de l'import</span>
        <span className="text-xs font-mono" style={{ color: 'var(--violet-deep)' }}>{total} élément{total > 1 ? 's' : ''}</span>
      </div>

      {Object.entries(TYPE_META).map(([type, meta]) => {
        const items = data[type] ?? []
        if (items.length === 0) return null
        const isCollapsed = collapsed[type]
        const activeCount = items.filter(i => !excluded.has(meta.key(i))).length

        return (
          <div key={type} style={{ borderBottom: '1px solid var(--border-soft)' }}>
            <button
              onClick={() => setCollapsed(c => ({ ...c, [type]: !c[type] }))}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-white/3"
            >
              <span className="text-sm">{meta.icon}</span>
              <span className="text-xs font-medium flex-1" style={{ color: 'var(--text-primary)' }}>
                {meta.label}
              </span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                {activeCount}/{items.length}
              </span>
              {isCollapsed ? <ChevronRight size={12} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={12} style={{ color: 'var(--text-tertiary)' }} />}
            </button>

            {!isCollapsed && (
              <div className="pb-1">
                {items.map((item, i) => {
                  const key = meta.key(item)
                  const isExcluded = excluded.has(key)
                  const slug = meta.slug(item) || data.project_slug || defaultProjectSlug

                  return (
                    <label key={i} className="flex items-center gap-2.5 px-4 py-1.5 cursor-pointer hover:bg-white/3 transition-colors">
                      <input
                        type="checkbox"
                        checked={!isExcluded}
                        onChange={() => onToggle(key)}
                        className="rounded flex-shrink-0"
                        style={{ accentColor: 'var(--violet-deep)', width: 13, height: 13 }}
                      />
                      <span
                        className="text-xs flex-1 truncate"
                        style={{
                          color: isExcluded ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                          textDecoration: isExcluded ? 'line-through' : 'none',
                        }}
                      >
                        {meta.name(item)}
                      </span>
                      {meta.extra?.(item)}
                      {slug && <ProjectBadge slug={slug} />}
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BulkImportInterface({ defaultProjectSlug, defaultClientId, contextLabel, onImportSuccess, onCancel }) {
  const { state } = useStore()
  const [rawJson, setRawJson] = useState('')
  const [parsed, setParsed] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [excluded, setExcluded] = useState(new Set())
  const [dryRun, setDryRun] = useState(false)
  const [result, setResult] = useState(null)
  const [showSchema, setShowSchema] = useState(false)

  const { importBulk, importing } = useBulkImport()

  // Find default project for display
  const defaultProject = defaultProjectSlug
    ? state.projects.find(p => ID_TO_SLUG[p.id] === defaultProjectSlug || p.id === normalizeSlug(defaultProjectSlug))
    : null

  // Debounced validation
  useEffect(() => {
    setResult(null)
    if (!rawJson.trim()) {
      setParsed(null)
      setParseError(null)
      return
    }

    const timer = setTimeout(() => {
      try {
        const json = JSON.parse(rawJson)
        const r = BulkImportSchema.safeParse(json)
        if (r.success) {
          setParsed(r.data)
          setParseError(null)
          setExcluded(new Set())
        } else {
          setParseError(formatZodError(r.error))
          setParsed(null)
        }
      } catch (e) {
        setParseError(`JSON invalide : ${e.message}`)
        setParsed(null)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [rawJson])

  function toggleExclude(key) {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleImport() {
    if (!parsed) return
    const r = importBulk(parsed, { dryRun, excluded, fallbackSlug: defaultProjectSlug, fallbackClientId: defaultClientId })
    setResult(r)
    if (r.success && !dryRun) {
      onImportSuccess?.(r.created)
    }
  }

  function handleReset() {
    setRawJson('')
    setParsed(null)
    setParseError(null)
    setResult(null)
    setExcluded(new Set())
  }

  const totalToCreate = parsed ? countEntities(parsed, excluded) : 0
  const canImport = parsed && totalToCreate > 0 && !importing

  return (
    <div className="flex flex-col gap-4">
      {/* Header hint — project */}
      {defaultProject && (
        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl"
          style={{ background: defaultProject.color + '12', border: `1px solid ${defaultProject.color}25`, color: defaultProject.color }}>
          <span>{defaultProject.emoji}</span>
          <span>Projet par défaut : <strong>{defaultProject.name}</strong> — les entités sans project_slug seront rattachées à ce projet.</span>
        </div>
      )}

      {/* Header hint — client context */}
      {contextLabel && (
        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl"
          style={{ background: 'rgba(168,212,240,0.1)', border: '1px solid rgba(168,212,240,0.2)', color: '#5A9EC4' }}>
          <span>👤</span>
          <span><strong>{contextLabel}</strong> — les entités importées sans client_id seront automatiquement liées à ce client.</span>
        </div>
      )}

      {/* Main content: textarea + preview */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: textarea */}
        <div className="flex flex-col gap-2 lg:flex-[3]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>JSON à importer</label>
            <button onClick={() => setShowSchema(true)} className="text-xs transition-colors underline underline-offset-2"
              style={{ color: 'var(--violet-deep)' }}>
              Voir le format attendu
            </button>
          </div>

          <textarea
            value={rawJson}
            onChange={e => setRawJson(e.target.value)}
            placeholder={`Colle ton JSON ici...\n\n{\n  "tasks": [\n    { "title": "Ma première tâche" }\n  ]\n}`}
            className="w-full rounded-2xl text-xs leading-relaxed resize-none focus:outline-none focus:ring-2"
            style={{
              minHeight: 340,
              background: 'var(--bg-input, rgba(0,0,0,0.12))',
              border: '1px solid var(--border-soft)',
              color: 'var(--text-secondary)',
              fontFamily: 'JetBrains Mono, monospace',
              padding: '14px 16px',
              focusRingColor: 'var(--violet-deep)',
            }}
            spellCheck={false}
          />

          {/* Status indicator */}
          {rawJson.trim() && (
            <div className="flex items-start gap-2 text-xs px-3 py-2 rounded-xl"
              style={
                parseError
                  ? { background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171' }
                  : parsed
                  ? { background: 'rgba(168,230,189,0.08)', border: '1px solid rgba(168,230,189,0.2)', color: '#A8E6BD' }
                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-soft)', color: 'var(--text-tertiary)' }
              }>
              {parseError
                ? <><AlertCircle size={13} className="flex-shrink-0 mt-0.5" /><span>{parseError}</span></>
                : parsed
                ? <><CheckCircle size={13} className="flex-shrink-0 mt-0.5" /><span>JSON valide · {countEntities(parsed)} entité{countEntities(parsed) > 1 ? 's' : ''} détectée{countEntities(parsed) > 1 ? 's' : ''}</span></>
                : null
              }
            </div>
          )}
        </div>

        {/* Right: preview */}
        {parsed && (
          <div className="lg:flex-[2]">
            <ImportPreview
              data={parsed}
              excluded={excluded}
              onToggle={toggleExclude}
              defaultProjectSlug={defaultProjectSlug}
            />
          </div>
        )}
      </div>

      {/* Result feedback */}
      {result && (
        <div className="flex items-start gap-2 text-sm px-4 py-3 rounded-xl"
          style={result.success
            ? { background: 'rgba(168,230,189,0.1)', border: '1px solid rgba(168,230,189,0.25)', color: '#A8E6BD' }
            : { background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171' }}>
          {result.success
            ? <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
            : <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />}
          <div>
            <p className="font-medium">
              {dryRun
                ? `Dry-run : ${result.created} élément${result.created > 1 ? 's' : ''} seraient créés.`
                : result.success
                ? `${result.created} élément${result.created > 1 ? 's' : ''} importé${result.created > 1 ? 's' : ''} avec succès !`
                : `${result.created} créé${result.created > 1 ? 's' : ''}, ${result.errors.length} erreur${result.errors.length > 1 ? 's' : ''}`}
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-xs opacity-80">· {e.entity} : {e.reason}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 pt-1">
        <label className="flex items-center gap-2 text-xs cursor-pointer select-none" style={{ color: 'var(--text-tertiary)' }}>
          <input
            type="checkbox"
            checked={dryRun}
            onChange={e => setDryRun(e.target.checked)}
            style={{ accentColor: 'var(--violet-deep)' }}
          />
          Mode dry-run (simuler sans créer)
        </label>

        <div className="flex-1" />

        {rawJson && (
          <button onClick={handleReset} className="text-xs px-3 py-2 rounded-xl transition-colors"
            style={{ color: 'var(--text-tertiary)', background: 'transparent' }}>
            Réinitialiser
          </button>
        )}
        {onCancel && (
          <button onClick={onCancel} className="text-xs px-4 py-2 rounded-xl transition-colors"
            style={{ background: 'var(--bg-input, rgba(255,255,255,0.05))', color: 'var(--text-secondary)' }}>
            Annuler
          </button>
        )}
        <button
          onClick={handleImport}
          disabled={!canImport}
          className="text-xs px-4 py-2 rounded-xl font-medium transition-all disabled:opacity-40"
          style={{ background: 'var(--violet-deep)', color: '#fff' }}
        >
          {importing ? 'Import en cours…' : dryRun ? `Simuler ${totalToCreate} élément${totalToCreate > 1 ? 's' : ''}` : `Importer ${totalToCreate} élément${totalToCreate > 1 ? 's' : ''}`}
        </button>
      </div>

      {showSchema && <SchemaModal onClose={() => setShowSchema(false)} />}
    </div>
  )
}
