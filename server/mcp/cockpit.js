// Outils MCP branchés sur le store réel du Cockpit (user_state) : tâches, projets,
// Studio Créatif (veille, assets, montages) et Sourcing Etsy. Utilisables par Claude, ChatGPT, Codex…
import { readState, mutateState, findById, newId } from './state.js'
import { demoDataset } from '../../src/lib/etsy/demo.js'
import { estimateListingSales } from '../../src/lib/etsy/estimation.js'
import { liveClient, loadShop, searchProducts } from '../etsy/service.js'
import { listingTrends, shopObservationsFromRows, counterVariations, summarizeVariation } from '../../src/lib/etsy/observations.js'

// Version compacte d'une fiche pour les IA : valeurs seules, « null » = indisponible (jamais 0 par défaut).
const val = m => (m && m.status !== 'unavailable' ? m.value : null)
function compactListing(l, shopsById = {}) {
  const m = l.metrics
  return {
    id: l.id, titre: l.title, url: l.url, boutique: shopsById[l.shopId]?.name || l.shopId, categorie: l.category, type: l.type,
    prix: val(m.price), devise: l.currency, vues: val(m.views), favoris: val(m.favorites), vues_par_jour: val(m.viewsPerDay),
    favoris_par_jour: val(m.favoritesPerDay), ratio_favoris_vues_pct: val(m.favRate), ventes_boutique_cumul: val(m.shopSold),
    avis_12_mois: val(m.reviews), anciennete_jours: val(m.ageDays), personnalisable: l.isPersonalizable, tags: l.tags,
  }
}
const compactShop = s => ({
  id: s.id, nom: s.name, url: s.url, pays: s.country, devise: s.currency, ventes_cumul: val(s.metrics.soldCount), favoris: val(s.metrics.favorites),
  avis: val(s.metrics.reviewCount), note: val(s.metrics.reviewAverage), fiches_actives: val(s.metrics.activeListings), anciennete_jours: val(s.metrics.ageDays),
})

const DATE = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Date AAAA-MM-JJ' }
const ID = { type: 'string', description: 'Identifiant' }
const TASK_STATUS = ['todo', 'inprogress', 'done']
const IMPACT = ['low', 'medium', 'high']
const VERDICTS = ['dupliquer', 'adapter', 'ignorer']
const CREATIVE_STATUS = ['a_analyser', 'analysee', 'dupliquee', 'ignoree']
const MONTAGE_STATUS = ['brief', 'en_cours', 'a_valider', 'livre']
const BUCKET = 'creative-files'

const now = () => new Date().toISOString()
const today = () => now().slice(0, 10)
const str = (v, max = 4000) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

function pick(obj, keys) {
  return Object.fromEntries(keys.filter(k => obj[k] !== undefined).map(k => [k, obj[k]]))
}

const taskView = t => pick(t, ['id', 'title', 'projectId', 'status', 'impact', 'dueDate', 'today', 'notes', 'goalId', 'createdAt', 'completedAt'])
const creativeView = c => pick(c, ['id', 'competitor', 'platform', 'format', 'title', 'sourceUrl', 'notes', 'tags', 'status', 'verdict', 'score', 'angle', 'hook', 'adaptation', 'createdAt'])

async function signedUrl(ctx, item) {
  if (!item?.filePath) return item?.url || null
  const { data } = await ctx.db.storage.from(BUCKET).createSignedUrl(item.filePath, 3600)
  return data?.signedUrl || null
}

function assertProject(state, id) {
  if (id) findById(state.projects, id, 'Projet')
}

export const COCKPIT_TOOLS = [
  {
    name: 'tableau_de_bord',
    description: "Vue d'ensemble du Cockpit : projets, tâches du jour et en retard, créas à analyser, montages en cours, boutiques Etsy suivies.",
    inputSchema: { type: 'object', properties: {} },
    async run(_args, ctx) {
      const { state: s, updated_at } = await readState(ctx)
      const d = today()
      const open = (s.tasks || []).filter(t => t.status !== 'done')
      return {
        date: d, derniere_synchro: updated_at,
        projets: (s.projects || []).map(p => pick(p, ['id', 'name', 'emoji', 'northStar'])),
        taches_du_jour: open.filter(t => t.today || t.dueDate === d).map(taskView),
        taches_en_retard: open.filter(t => t.dueDate && t.dueDate < d).map(taskView),
        taches_ouvertes: open.length,
        studio: {
          creas_a_analyser: (s.creatives || []).filter(c => c.status === 'a_analyser').length,
          creas_total: (s.creatives || []).length,
          assets: (s.assets || []).length,
          montages_en_cours: (s.montages || []).filter(m => m.status !== 'livre').map(m => pick(m, ['id', 'title', 'status', 'aspect'])),
        },
        etsy: { mode: s.etsy?.mode || 'demo', boutiques_suivies: (s.etsy?.shops || []).map(x => pick(x, ['id', 'name', 'source'])) },
      }
    },
  },
  {
    name: 'lister_projets',
    description: 'Liste les projets (pôles) du Cockpit avec leur North Star.',
    inputSchema: { type: 'object', properties: {} },
    async run(_args, ctx) {
      const { state } = await readState(ctx)
      return (state.projects || []).map(p => pick(p, ['id', 'name', 'emoji', 'tier', 'northStar', 'northStarProgress']))
    },
  },
  {
    name: 'lister_taches',
    description: 'Liste les tâches, filtrables par projet, statut ou texte.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: ID, status: { type: 'string', enum: TASK_STATUS },
        recherche: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 200 },
      },
    },
    async run(args, ctx) {
      const { state } = await readState(ctx)
      const q = (args.recherche || '').toLowerCase()
      return (state.tasks || [])
        .filter(t => (!args.project_id || t.projectId === args.project_id) && (!args.status || t.status === args.status)
          && (!q || `${t.title} ${t.notes || ''}`.toLowerCase().includes(q)))
        .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))
        .slice(0, args.limit ?? 50)
        .map(taskView)
    },
  },
  {
    name: 'creer_tache',
    description: 'Crée une tâche dans un projet du Cockpit.',
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' }, project_id: ID, notes: { type: 'string' },
        impact: { type: 'string', enum: IMPACT }, due_date: DATE,
        today: { type: 'boolean', description: 'À faire aujourd’hui' },
      },
    },
    async run(args, ctx) {
      return mutateState(ctx, s => {
        assertProject(s, args.project_id)
        const task = {
          id: newId(), title: str(args.title, 300), projectId: args.project_id || null, status: 'todo',
          impact: args.impact || 'medium', ship80: false, ship80Delivered: false, today: !!args.today,
          dueDate: args.due_date || null, notes: str(args.notes) || '', tags: [], checklist: [],
          orderIndex: Date.now(), createdAt: now(), updatedAt: now(), completedAt: null, createdBy: ctx.actorLabel,
        }
        s.tasks = [...(s.tasks || []), task]
        return taskView(task)
      })
    },
  },
  {
    name: 'modifier_tache',
    description: 'Met à jour une tâche : statut (todo / inprogress / done), titre, notes, impact, échéance, projet.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: ID, title: { type: 'string' }, notes: { type: 'string' }, project_id: ID,
        status: { type: 'string', enum: TASK_STATUS }, impact: { type: 'string', enum: IMPACT },
        due_date: DATE, today: { type: 'boolean' },
      },
    },
    async run(args, ctx) {
      return mutateState(ctx, s => {
        const t = findById(s.tasks, args.id, 'Tâche')
        assertProject(s, args.project_id)
        if (args.title !== undefined) t.title = str(args.title, 300) || t.title
        if (args.notes !== undefined) t.notes = args.notes
        if (args.project_id !== undefined) t.projectId = args.project_id
        if (args.impact) t.impact = args.impact
        if (args.due_date !== undefined) t.dueDate = args.due_date
        if (args.today !== undefined) t.today = args.today
        if (args.status && args.status !== t.status) {
          t.completedAt = args.status === 'done' ? now() : null
          t.status = args.status
        }
        t.updatedAt = now()
        return taskView(t)
      })
    },
  },

  // ── Studio Créatif ──────────────────────────────────────────
  {
    name: 'lister_creas',
    description: 'Liste les créas de la veille concurrentielle du Studio (à analyser, analysées…).',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: CREATIVE_STATUS }, verdict: { type: 'string', enum: VERDICTS },
        concurrent: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 200 },
      },
    },
    async run(args, ctx) {
      const { state } = await readState(ctx)
      const comp = (args.concurrent || '').toLowerCase()
      return (state.creatives || [])
        .filter(c => (!args.status || c.status === args.status) && (!args.verdict || c.verdict === args.verdict)
          && (!comp || (c.competitor || '').toLowerCase().includes(comp)))
        .slice(0, args.limit ?? 50)
        .map(c => ({ ...creativeView(c), analyses: (c.analyses || []).length }))
    },
  },
  {
    name: 'voir_crea',
    description: "Détail d'une créa avec un lien temporaire (1 h) vers son média et toutes les analyses déjà déposées (par Claude, ChatGPT, Gemini…). Regarde le média avant d'analyser.",
    inputSchema: { type: 'object', required: ['id'], properties: { id: ID } },
    async run(args, ctx) {
      const { state } = await readState(ctx)
      const c = findById(state.creatives, args.id, 'Créa')
      return { ...creativeView(c), fileType: c.fileType || null, mediaUrl: await signedUrl(ctx, c), contexte_marque: state.settings?.studioBrand || null, analyses: c.analyses || [] }
    },
  },
  {
    name: 'ajouter_crea',
    description: 'Ajoute une créa concurrente à la veille (lien vers la pub, notes, texte).',
    inputSchema: {
      type: 'object',
      required: ['concurrent'],
      properties: {
        concurrent: { type: 'string' }, platform: { type: 'string', enum: ['meta', 'tiktok', 'youtube', 'autre'] },
        format: { type: 'string', enum: ['video', 'image', 'carrousel', 'story', 'autre'] },
        title: { type: 'string' }, source_url: { type: 'string' }, media_url: { type: 'string', description: 'Lien direct vers l’image ou la vidéo' },
        notes: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } },
      },
    },
    async run(args, ctx) {
      return mutateState(ctx, s => {
        const c = {
          id: crypto.randomUUID(), competitor: str(args.concurrent, 200), platform: args.platform || 'autre', format: args.format || 'video',
          title: str(args.title, 300), sourceUrl: str(args.source_url, 2000), url: str(args.media_url, 2000), filePath: null, fileType: null,
          notes: str(args.notes), tags: (args.tags || []).slice(0, 20), status: 'a_analyser', verdict: null, score: null,
          angle: null, hook: null, adaptation: null, analyses: [], createdAt: now(), updatedAt: now(), createdBy: ctx.actorLabel,
        }
        s.creatives = [c, ...(s.creatives || [])]
        return creativeView(c)
      })
    },
  },
  {
    name: 'enregistrer_analyse_crea',
    description: "Dépose ton analyse d'une créa (verdict dupliquer / adapter / ignorer, score, angle, accroche, proposition d'adaptation). Elle s'ajoute à l'historique à ton nom ; verdict, score, angle, accroche et proposition ne remplissent la fiche que s'ils sont vides, sauf si appliquer = true.",
    inputSchema: {
      type: 'object',
      required: ['id', 'verdict', 'reasoning'],
      properties: {
        id: ID, verdict: { type: 'string', enum: VERDICTS }, score: { type: 'integer', minimum: 0, maximum: 100 },
        angle: { type: 'string' }, hook: { type: 'string' }, emotion: { type: 'string' }, target: { type: 'string' }, cta: { type: 'string' },
        strengths: { type: 'string' }, weaknesses: { type: 'string' }, adaptation: { type: 'string' },
        reasoning: { type: 'string', description: 'Pourquoi ce verdict' },
        description: { type: 'string', description: 'Ce que tu as réellement vu du média (ou « média non consulté »)' },
        appliquer: { type: 'boolean', description: 'Remplacer le verdict et les champs de la fiche par cette analyse' },
      },
    },
    async run(args, ctx) {
      return mutateState(ctx, s => {
        const c = findById(s.creatives, args.id, 'Créa')
        const entry = {
          id: crypto.randomUUID(), source: 'mcp', model: ctx.actorLabel, createdAt: now(),
          verdict: args.verdict, score: Number.isFinite(args.score) ? Math.max(0, Math.min(100, Math.round(args.score))) : null,
          ...Object.fromEntries(['angle', 'hook', 'emotion', 'target', 'cta', 'strengths', 'weaknesses', 'adaptation', 'reasoning', 'description'].map(k => [k, str(args[k], 2000)])),
        }
        const force = !!args.appliquer
        c.analyses = [entry, ...(c.analyses || [])]
        for (const k of ['verdict', 'score', 'angle', 'hook', 'adaptation']) {
          if (entry[k] != null && (force || c[k] == null || c[k] === '')) c[k] = entry[k]
        }
        if (force || c.status === 'a_analyser') c.status = c.verdict === 'ignorer' ? 'ignoree' : 'analysee'
        c.updatedAt = now()
        return { crea: creativeView(c), analyse: entry }
      })
    },
  },
  {
    name: 'lister_assets',
    description: 'Liste les assets du Studio (images, vidéos, audio, scripts), avec un lien temporaire si demandé.',
    inputSchema: {
      type: 'object',
      properties: { kind: { type: 'string', enum: ['video', 'image', 'audio', 'texte'] }, avec_liens: { type: 'boolean' }, limit: { type: 'integer', minimum: 1, maximum: 100 } },
    },
    async run(args, ctx) {
      const { state } = await readState(ctx)
      const list = (state.assets || []).filter(a => !args.kind || a.kind === args.kind).slice(0, args.limit ?? 50)
      return Promise.all(list.map(async a => ({
        ...pick(a, ['id', 'title', 'kind', 'source', 'prompt', 'tags', 'projectId', 'createdAt']),
        ...(args.avec_liens ? { mediaUrl: await signedUrl(ctx, a) } : {}),
      })))
    },
  },
  {
    name: 'ajouter_asset',
    description: 'Ajoute un asset au Studio : un lien vers un média, ou un texte (script, voix off, accroches) dans « contenu ».',
    inputSchema: {
      type: 'object',
      required: ['title', 'kind'],
      properties: {
        title: { type: 'string' }, kind: { type: 'string', enum: ['video', 'image', 'audio', 'texte'] },
        url: { type: 'string' }, contenu: { type: 'string', description: 'Texte de l’asset (pour kind = texte)' },
        prompt: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, project_id: ID,
      },
    },
    async run(args, ctx) {
      return mutateState(ctx, s => {
        assertProject(s, args.project_id)
        const a = {
          id: crypto.randomUUID(), title: str(args.title, 300), kind: args.kind, source: 'mcp', filePath: null, fileType: null, fileSize: null,
          url: str(args.url, 2000), text: str(args.contenu, 20000), prompt: str(args.prompt), tags: (args.tags || []).slice(0, 20),
          projectId: args.project_id || null, createdAt: now(), updatedAt: now(), createdBy: ctx.actorLabel,
        }
        s.assets = [a, ...(s.assets || [])]
        return pick(a, ['id', 'title', 'kind', 'url'])
      })
    },
  },
  {
    name: 'lister_montages',
    description: 'Liste les montages vidéo du Studio avec leur brief et leurs clips.',
    inputSchema: { type: 'object', properties: { status: { type: 'string', enum: MONTAGE_STATUS } } },
    async run(args, ctx) {
      const { state } = await readState(ctx)
      return (state.montages || []).filter(m => !args.status || m.status === args.status)
        .map(m => pick(m, ['id', 'title', 'aspect', 'status', 'brief', 'projectId', 'clips', 'createdAt']))
    },
  },
  {
    name: 'creer_montage',
    description: 'Crée un montage (brief) dans le Studio, par exemple à partir d’une créa à dupliquer.',
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: { title: { type: 'string' }, brief: { type: 'string' }, aspect: { type: 'string', enum: ['9:16', '4:5', '1:1', '16:9'] }, project_id: ID },
    },
    async run(args, ctx) {
      return mutateState(ctx, s => {
        assertProject(s, args.project_id)
        const m = {
          id: crypto.randomUUID(), title: str(args.title, 300), aspect: args.aspect || '9:16', projectId: args.project_id || null,
          brief: str(args.brief, 10000), status: 'brief', clips: [], createdAt: now(), updatedAt: now(), createdBy: ctx.actorLabel,
        }
        s.montages = [m, ...(s.montages || [])]
        return pick(m, ['id', 'title', 'aspect', 'status'])
      })
    },
  },
  {
    name: 'modifier_montage',
    description: "Met à jour le titre, le brief ou le statut d'un montage.",
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: ID, title: { type: 'string' }, brief: { type: 'string' }, status: { type: 'string', enum: MONTAGE_STATUS } },
    },
    async run(args, ctx) {
      return mutateState(ctx, s => {
        const m = findById(s.montages, args.id, 'Montage')
        if (args.title) m.title = str(args.title, 300)
        if (args.brief !== undefined) m.brief = str(args.brief, 10000)
        if (args.status) m.status = args.status
        m.updatedAt = now()
        return pick(m, ['id', 'title', 'status', 'brief'])
      })
    },
  },

  // ── Sourcing Etsy ───────────────────────────────────────────
  {
    name: 'etsy_donnees',
    description: "Boutiques Etsy suivies et leurs fiches, avec le statut de chaque chiffre (observé / calculé / estimé / indisponible). En mode démonstration les données sont synthétiques : ne les présente jamais comme réelles. N'invente aucune vente ni CA : une valeur indisponible reste indisponible.",
    inputSchema: { type: 'object', properties: { shop_id: { type: 'integer' }, limit: { type: 'integer', minimum: 1, maximum: 200 } } },
    async run(args, ctx) {
      const { state } = await readState(ctx)
      const ws = { shops: [], collections: [], favorites: [], notes: {}, ...(state.etsy || {}) }
      if (process.env.ETSY_LIVE_ENABLED === 'true') {
        return { mode: 'live', boutiques_suivies: ws.shops.filter(s => s.source === 'etsy'), favoris: ws.favorites, notes: ws.notes,
          info: 'Données réelles : utilise « etsy_recherche_produits » (niche par mots-clés) et « etsy_boutique » (catalogue complet d’une boutique).' }
      }
      const demo = demoDataset()
      const tracked = new Set(ws.shops.filter(s => s.source === 'demo').map(s => s.id))
      const shops = demo.shops.filter(s => tracked.has(s.id) && (!args.shop_id || s.id === args.shop_id))
      const ids = new Set(shops.map(s => s.id))
      const listings = demo.listings.filter(l => ids.has(l.shopId)).slice(0, args.limit ?? 60).map(l => ({
        ...l, note: ws.notes[l.id] || null,
        metrics: { ...l.metrics, estSales: estimateListingSales(l, { trackingAllowed: false, observationCount: 0 }) },
      }))
      return {
        mode: 'demo', avertissement: 'Données 100 % synthétiques (mode démonstration).',
        boutiques: shops, fiches: listings, favoris: ws.favorites, collections: ws.collections,
        ...(shops.length ? {} : { info: `Aucune boutique suivie. Boutiques de démo disponibles : ${demo.shops.map(s => s.name).join(', ')}.` }),
      }
    },
  },
  {
    name: 'etsy_recherche_produits',
    description: "Recherche produit sur tout Etsy (données réelles, API officielle) : fiches actives par mots-clés avec prix, vues, favoris, vues/jour, favoris/jour, ratio favoris/vues, ventes cumulées de la boutique et ancienneté. Idéal pour évaluer une niche. Les vues et favoris sont cumulés depuis la création de la fiche ; aucune vente par fiche n'est fournie par Etsy : ne l'invente pas. Coût : ~2 appels API par 100 fiches (quota 5 000/jour).",
    inputSchema: {
      type: 'object',
      required: ['mots_cles'],
      properties: {
        mots_cles: { type: 'string', description: 'En anglais de préférence (marché Etsy principal)' },
        prix_min: { type: 'number' }, prix_max: { type: 'number' },
        tri: { type: 'string', enum: ['score', 'created', 'price'], description: 'score = pertinence Etsy' },
        nombre: { type: 'integer', minimum: 25, maximum: 300 },
      },
    },
    async run(args) {
      const client = liveClient()
      const r = await searchProducts(client, { keywords: args.mots_cles, minPrice: args.prix_min, maxPrice: args.prix_max, sortOn: args.tri || 'score', maxItems: args.nombre ?? 100 })
      const shopsById = Object.fromEntries(r.shops.map(s => [s.id, s]))
      return {
        mots_cles: r.keywords, resultats_etsy_total: r.total, fiches_analysees: r.fetched, releve_le: r.fetchedAt, note: r.note,
        fiches: r.listings.map(l => compactListing(l, shopsById)), boutiques: r.shops.map(compactShop), quota: client.quota(),
      }
    },
  },
  {
    name: 'etsy_boutique',
    description: "Catalogue complet d'une boutique Etsy réelle (nom, identifiant ou URL) : stats de la boutique et toutes ses fiches actives avec vues, favoris, ratios et avis des 12 derniers mois par fiche.",
    inputSchema: { type: 'object', required: ['boutique'], properties: { boutique: { type: 'string' } } },
    async run(args) {
      const client = liveClient()
      const r = await loadShop(client, args.boutique)
      delete r.raw
      return { boutique: compactShop(r.shop), catalogue: r.catalog, fiches: r.listings.map(l => compactListing(l, { [r.shop.id]: r.shop })), quota: client.quota() }
    },
  },
  {
    name: 'etsy_tendances',
    description: "Tendances mesurées par le suivi quotidien (relevés des boutiques ajoutées et des fiches en favori) : vues et favoris gagnés par fiche sur la période, et variation du compteur de ventes de chaque boutique. Ce sont des variations entre relevés, pas des ventes par fiche.",
    inputSchema: { type: 'object', properties: { jours: { type: 'integer', minimum: 1, maximum: 90, description: 'Fenêtre (7 par défaut)' }, limit: { type: 'integer', minimum: 1, maximum: 200 } } },
    async run(args, ctx) {
      const since = new Date(Date.now() - 90 * 86400e3).toISOString().slice(0, 10)
      const { data: rows, error } = await ctx.db.from('etsy_snapshots').select('kind, entity_id, shop_id, day, at, vals').eq('user_id', ctx.userId).gte('day', since).order('day').limit(50000)
      if (error) throw new Error(`Historique indisponible : ${error.message}`)
      if (!rows.length) return { info: 'Aucun relevé : ajoute des boutiques réelles dans l’onglet Sourcing Etsy ou mets des fiches en favori. Le relevé est quotidien (5 h UTC).' }
      const trends = listingTrends(rows, { days: args.jours ?? 7 })
      const titles = new Map(rows.filter(r => r.kind === 'listing').map(r => [Number(r.entity_id), { titre: r.vals?.title, boutique: r.shop_id, prix: r.vals?.price, vues: r.vals?.views, favoris: r.vals?.favorites }]))
      const fiches = [...trends].filter(([, t]) => t.span).map(([id, t]) => ({ id, ...titles.get(id), vues_gagnees: t.views, favoris_gagnes: t.favorites, sur_jours: t.span }))
        .sort((a, b) => (b.vues_gagnees ?? -1) - (a.vues_gagnees ?? -1)).slice(0, args.limit ?? 50)
      const obs = shopObservationsFromRows(rows)
      const boutiques = [...new Set(obs.map(o => o.shopId))].map(id => ({ shop_id: id, ventes: summarizeVariation(counterVariations(obs, id, 'soldCount')) }))
      return { premier_releve: rows[0].day, dernier_releve: rows.at(-1).day, fiches_suivies: trends.size, fiches, boutiques, ...(fiches.length ? {} : { info: 'Un seul relevé pour l’instant : les tendances apparaissent après le prochain relevé.' }) }
    },
  },
  {
    name: 'etsy_noter_fiche',
    description: 'Ajoute ou remplace la note de sourcing sur une fiche Etsy (ton analyse, idée de produit…) et peut la mettre en favori.',
    inputSchema: {
      type: 'object',
      required: ['listing_id', 'note'],
      properties: { listing_id: { type: 'integer' }, note: { type: 'string' }, favori: { type: 'boolean' } },
    },
    async run(args, ctx) {
      return mutateState(ctx, s => {
        const ws = { mode: 'demo', shops: [], collections: [], favorites: [], notes: {}, columns: null, observations: [], ...(s.etsy || {}) }
        ws.notes = { ...ws.notes, [args.listing_id]: `${str(args.note, 4000) || ''}\n— ${ctx.actorLabel}`.trim() }
        if (args.favori === true && !ws.favorites.includes(args.listing_id)) ws.favorites = [...ws.favorites, args.listing_id]
        if (args.favori === false) ws.favorites = ws.favorites.filter(x => x !== args.listing_id)
        s.etsy = ws
        return { listing_id: args.listing_id, note: ws.notes[args.listing_id], favori: ws.favorites.includes(args.listing_id) }
      })
    },
  },
]
