import { createContext, useContext, useReducer, useEffect } from 'react'

const STATE_VERSION = 3
const nanoid = () => Math.random().toString(36).slice(2, 10)

const PROJECTS = [
  { id: 'p1', name: 'Ulycom', tier: 1, color: '#A8E6BD', emoji: '⚡', northStar: 'Signer 3 nouveaux clients', northStarProgress: 35 },
  { id: 'p2', name: 'Yoovi', tier: 2, color: '#8B7CFF', emoji: '🚀', northStar: '1er abonné payant', northStarProgress: 60 },
  { id: 'p3', name: 'E-commerce', tier: 3, color: '#FFD66B', emoji: '🛍', northStar: '10 000€ de CA', northStarProgress: 20 },
  { id: 'p4', name: 'SaaS', tier: 4, color: '#FFB088', emoji: '💡', northStar: 'MVP en ligne', northStarProgress: 10 },
]

const INITIAL_STATE = {
  _version: STATE_VERSION,
  energy: 3,
  tagStyles: {},
  projects: PROJECTS,
  tasks: [
    { id: 't1', title: 'Finaliser le deck commercial Ulycom', projectId: 'p1', status: 'inprogress', impact: 'high', ship80: false, ship80Delivered: false, today: true, dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), notes: 'Envoyer avant vendredi', createdAt: new Date().toISOString(), completedAt: null },
    { id: 't2', title: 'Tester le flow onboarding Yoovi', projectId: 'p2', status: 'todo', impact: 'high', ship80: true, ship80Delivered: false, today: true, dueDate: new Date(Date.now() + 172800000).toISOString().slice(0, 10), notes: '', createdAt: new Date().toISOString(), completedAt: null },
    { id: 't3', title: 'Sourcer 5 nouveaux produits e-com', projectId: 'p3', status: 'todo', impact: 'low', ship80: false, ship80Delivered: false, today: false, dueDate: new Date(Date.now() + 604800000).toISOString().slice(0, 10), notes: '', createdAt: new Date().toISOString(), completedAt: null },
    { id: 't4', title: 'Rédiger la landing page SaaS', projectId: 'p4', status: 'todo', impact: 'high', ship80: true, ship80Delivered: false, today: false, dueDate: new Date(Date.now() + 259200000).toISOString().slice(0, 10), notes: '', createdAt: new Date().toISOString(), completedAt: null },
  ],
  sessions: [
    { id: 's1', projectId: 'p1', taskId: 't1', duration: 5400, note: 'Rédigé les slides 1-8 du deck', date: new Date(Date.now() - 86400000).toISOString() },
    { id: 's2', projectId: 'p2', taskId: 't2', duration: 3600, note: 'Identifié 3 bugs dans le flow onboarding', date: new Date(Date.now() - 172800000).toISOString() },
    { id: 's3', projectId: 'p1', taskId: null, duration: 2700, note: 'Appel client stratégique', date: new Date(Date.now() - 259200000).toISOString() },
  ],
  resources: [
    { id: 'r1', type: 'prompt', title: 'Redesign UI Agent', projectId: 'p2', tag: 'Design', category: 'Tech', description: 'Prompt pour refondre un composant React avec Tailwind', content: `Tu es un expert UX/UI senior. Analyse ce composant React et propose une refonte complète qui améliore : 1) La hiérarchie visuelle, 2) L'accessibilité (WCAG AA), 3) La cohérence avec un design system dark mode. Fournis le code JSX + Tailwind directement. Objectif : 80% de qualité en 20% du temps.`, url: '' },
    { id: 'r2', type: 'prompt', title: 'Email de prospection agence', projectId: 'p1', tag: 'Prospection', category: 'Marketing', description: 'Prompt pour générer des emails B2B personnalisés', content: `Rédige un email de prospection B2B pour notre agence Ulycom. Contexte : [NOM_CLIENT] est une PME dans [SECTEUR]. Ton : professionnel mais direct. Structure : accroche personnalisée (1 phrase) + problème qu'on résout (2 phrases) + preuve sociale (1 ligne) + CTA clair. Max 150 mots. Pas de "J'espère que vous allez bien".`, url: '' },
    { id: 'r3', type: 'prompt', title: 'Analyse produit e-com', projectId: 'p3', tag: 'Analyse', category: 'Stratégie', description: 'Évaluation rapide de viabilité produit', content: `Analyse ce produit pour la vente en ligne : [PRODUIT]. Donne-moi : 1) Score de viabilité (1-10) avec justification, 2) Prix de vente recommandé (marge cible 40%), 3) Top 3 angles marketing, 4) Risques principaux. Format bullet points, moins de 200 mots.`, url: '' },
    { id: 'r4', type: 'template', title: 'Template devis agence', projectId: 'p1', tag: 'Commercial', category: 'Commercial', description: 'Devis standard pour prestations agence', content: `DEVIS N° [NUMERO] — [DATE]\n\nClient : [NOM_CLIENT]\nContact : [NOM_CONTACT] — [EMAIL]\n\n---\n\nPRESTATION : [NOM_PRESTATION]\n\nDétail :\n• Phase 1 — Audit & Stratégie : [PRIX_1]€ HT\n• Phase 2 — Production : [PRIX_2]€ HT\n• Phase 3 — Livraison : [PRIX_3]€ HT\n\n---\n\nTOTAL HT : [TOTAL]€\nTVA (20%) : [TVA]€\nTOTAL TTC : [TOTAL_TTC]€\n\nConditions : 50% à la commande, 50% à la livraison. Validité : 30 jours.`, url: '' },
    { id: 'r5', type: 'template', title: 'Email post-prospect Yoovi', projectId: 'p2', tag: 'Follow-up', category: 'Marketing', description: 'Follow-up après un appel de prospection', content: `Objet : Suite à notre échange — Yoovi\n\nBonjour [PRÉNOM],\n\nMerci pour notre conversation de [DATE].\n\n→ Problème identifié : [PROBLÈME]\n→ Ce que Yoovi résout : [BÉNÉFICE]\n→ Prochaine étape : [ACTION]\n\nAccès démo : [LIEN]\n\n[VOTRE_NOM] — Yoovi`, url: '' },
  ],
  learningResources: [
    { id: 'l1', type: 'livre', title: 'The Mom Test', author: 'Rob Fitzpatrick', category: 'Business', status: 'done', url: '', notes: 'Parler aux clients sans biais de complaisance. Poser des questions sur leur vie, pas sur ton idée.', takeaways: ['Ne pas parler de ton idée en premier', 'Poser des questions sur le passé', "Trouver le vrai problème"], citations: ['"La mesure d\'un bon entretien : est-ce que tu as appris quelque chose que tu ne savais pas ?"'] },
    { id: 'l2', type: 'video', title: 'How to build a great product', author: 'Paul Graham / YC', category: 'Productivité', status: 'en_cours', url: '', notes: '', takeaways: [], citations: [] },
  ],
  calendarEvents: [],
  inbox: [],
  settings: { endOfWorkday: '20:00', dailyCapacityMinutes: 480 },
  clients: [],
  clientNotes: [],
  clientDocuments: [],
  clientInvoices: [],
  appointments: [],
  dailyReviews: [],
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_ENERGY': return { ...state, energy: action.payload }

    case 'SET_TAG_STYLE':
      return { ...state, tagStyles: { ...state.tagStyles, [action.payload.tag]: action.payload.color } }

    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, { ship80Delivered: false, tags: [], startDate: null, coverUrl: null, orderIndex: Date.now(), checklist: [], cardColor: null, cardImageUrl: null, cardImagePath: null, cardImageName: null, inlineNote: null, progressPercentage: null, commentsCount: 0, attachmentsCount: 0, id: nanoid(), createdAt: new Date().toISOString(), completedAt: null, ...action.payload }] }
    case 'UPDATE_TASK':
      return { ...state, tasks: state.tasks.map(t => t.id === action.payload.id ? { ...t, ...action.payload } : t) }
    case 'REORDER_TASKS': {
      // payload: { taskId, newStatus, orderedIds } — reorder within/between columns
      const { taskId, newStatus, orderedIds } = action.payload
      const taskMap = Object.fromEntries(state.tasks.map(t => [t.id, t]))
      const updated = state.tasks.map(t => {
        if (t.id === taskId) return { ...t, status: newStatus }
        return t
      })
      // Apply orderIndex from the orderedIds array
      return { ...state, tasks: updated.map(t => {
        const idx = orderedIds.indexOf(t.id)
        return idx >= 0 ? { ...t, orderIndex: idx } : t
      })}
    }
    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload) }
    case 'TOGGLE_TASK_DONE':
      return { ...state, tasks: state.tasks.map(t => { if (t.id !== action.payload) return t; const done = t.status === 'done'; return { ...t, status: done ? 'todo' : 'done', completedAt: done ? null : new Date().toISOString() } }) }
    case 'SHIP80_DELIVER':
      return { ...state, tasks: state.tasks.map(t => t.id === action.payload ? { ...t, status: 'done', ship80Delivered: true, completedAt: new Date().toISOString() } : t) }

    case 'ADD_INBOX':
      return { ...state, inbox: [...state.inbox, { id: nanoid(), text: action.payload.text, type: action.payload.type || 'task', createdAt: new Date().toISOString() }] }
    case 'REMOVE_INBOX':
      return { ...state, inbox: state.inbox.filter(i => i.id !== action.payload) }
    case 'CLEAR_INBOX':
      return { ...state, inbox: [] }
    case 'ASSIGN_INBOX': {
      const { inboxId, projectId } = action.payload
      const item = state.inbox.find(i => i.id === inboxId)
      if (!item) return state
      return { ...state, inbox: state.inbox.filter(i => i.id !== inboxId), tasks: [...state.tasks, { id: nanoid(), title: item.text, projectId, status: 'todo', impact: 'low', ship80: false, ship80Delivered: false, today: false, dueDate: null, notes: '', createdAt: new Date().toISOString(), completedAt: null }] }
    }

    case 'UPDATE_PROJECT':
      return { ...state, projects: state.projects.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) }

    case 'REORDER_PROJECTS':
      return { ...state, projects: action.payload }

    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, { id: nanoid(), tier: state.projects.length + 1, northStar: '', northStarProgress: 0, ...action.payload }] }

    case 'DELETE_PROJECT': {
      const pid = action.payload
      return { ...state, projects: state.projects.filter(p => p.id !== pid), tasks: state.tasks.filter(t => t.projectId !== pid), sessions: state.sessions.filter(s => s.projectId !== pid) }
    }

    case 'LOG_SESSION':
      return { ...state, sessions: [{ ...action.payload, id: nanoid(), date: new Date().toISOString() }, ...state.sessions] }

    case 'ADD_RESOURCE':
      return { ...state, resources: [...state.resources, { id: nanoid(), ...action.payload }] }
    case 'UPDATE_RESOURCE':
      return { ...state, resources: state.resources.map(r => r.id === action.payload.id ? { ...r, ...action.payload } : r) }
    case 'DELETE_RESOURCE':
      return { ...state, resources: state.resources.filter(r => r.id !== action.payload) }

    case 'ADD_LEARNING':
      return { ...state, learningResources: [...state.learningResources, { notes: '', takeaways: [], citations: [], id: nanoid(), ...action.payload }] }
    case 'UPDATE_LEARNING':
      return { ...state, learningResources: state.learningResources.map(l => l.id === action.payload.id ? { ...l, ...action.payload } : l) }
    case 'DELETE_LEARNING':
      return { ...state, learningResources: state.learningResources.filter(l => l.id !== action.payload) }

    case 'ADD_CALENDAR_EVENT':
      return { ...state, calendarEvents: [...state.calendarEvents, { ...action.payload, id: nanoid() }] }
    case 'UPDATE_CALENDAR_EVENT':
      return { ...state, calendarEvents: state.calendarEvents.map(e => e.id === action.payload.id ? { ...e, ...action.payload } : e) }
    case 'DELETE_CALENDAR_EVENT':
      return { ...state, calendarEvents: state.calendarEvents.filter(e => e.id !== action.payload) }

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } }

    // ── Clients ─────────────────────────────────────────────────────────
    case 'ADD_CLIENT':
      return { ...state, clients: [...state.clients, { ...action.payload, id: nanoid(), createdAt: new Date().toISOString() }] }
    case 'UPDATE_CLIENT':
      return { ...state, clients: state.clients.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c) }
    case 'DELETE_CLIENT':
      return {
        ...state,
        clients: state.clients.filter(c => c.id !== action.payload),
        clientNotes: state.clientNotes.filter(n => n.clientId !== action.payload),
        clientDocuments: state.clientDocuments.filter(d => d.clientId !== action.payload),
        clientInvoices: state.clientInvoices.filter(i => i.clientId !== action.payload),
        appointments: state.appointments.filter(a => a.clientId !== action.payload),
      }
    case 'ARCHIVE_CLIENT':
      return { ...state, clients: state.clients.map(c => c.id === action.payload ? { ...c, status: 'archived' } : c) }

    // ── Client Notes ─────────────────────────────────────────────────────
    case 'ADD_CLIENT_NOTE':
      return { ...state, clientNotes: [...state.clientNotes, { ...action.payload, id: nanoid(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }] }
    case 'UPDATE_CLIENT_NOTE':
      return { ...state, clientNotes: state.clientNotes.map(n => n.id === action.payload.id ? { ...n, ...action.payload, updatedAt: new Date().toISOString() } : n) }
    case 'DELETE_CLIENT_NOTE':
      return { ...state, clientNotes: state.clientNotes.filter(n => n.id !== action.payload) }

    // ── Client Documents ─────────────────────────────────────────────────
    case 'ADD_CLIENT_DOCUMENT':
      return { ...state, clientDocuments: [...state.clientDocuments, { id: nanoid(), createdAt: new Date().toISOString(), ...action.payload }] }
    case 'DELETE_CLIENT_DOCUMENT':
      return { ...state, clientDocuments: state.clientDocuments.filter(d => d.id !== action.payload) }

    // ── Client Invoices ──────────────────────────────────────────────────
    case 'ADD_CLIENT_INVOICE':
      return { ...state, clientInvoices: [...state.clientInvoices, { ...action.payload, id: nanoid(), createdAt: new Date().toISOString() }] }
    case 'UPDATE_CLIENT_INVOICE':
      return { ...state, clientInvoices: state.clientInvoices.map(i => i.id === action.payload.id ? { ...i, ...action.payload } : i) }
    case 'DELETE_CLIENT_INVOICE':
      return { ...state, clientInvoices: state.clientInvoices.filter(i => i.id !== action.payload) }

    // ── Appointments ─────────────────────────────────────────────────────
    case 'ADD_APPOINTMENT':
      return { ...state, appointments: [...state.appointments, { ...action.payload, id: nanoid(), createdAt: new Date().toISOString() }] }
    case 'UPDATE_APPOINTMENT':
      return { ...state, appointments: state.appointments.map(a => a.id === action.payload.id ? { ...a, ...action.payload } : a) }
    case 'DELETE_APPOINTMENT':
      return { ...state, appointments: state.appointments.filter(a => a.id !== action.payload) }

    case 'ADD_DAILY_REVIEW':
      return { ...state, dailyReviews: [...state.dailyReviews, { ...action.payload, id: nanoid(), createdAt: new Date().toISOString() }] }
    case 'SKIP_DAILY_REVIEW':
      return { ...state, dailyReviews: [...state.dailyReviews, { id: nanoid(), date: action.payload.date, skipped: true, createdAt: new Date().toISOString() }] }

    case 'HYDRATE_STATE':
      // Replace entire state with data loaded from Supabase (post-migration)
      return { ...action.payload, _version: STATE_VERSION }

    default: return state
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem('cockpit_state')
    if (raw) {
      const parsed = JSON.parse(raw)
      const storedVersion = parsed._version || 0
      if (storedVersion >= STATE_VERSION) return parsed
      // Soft migration: merge stored data with new default fields (preserves user data)
      if (storedVersion >= 2) {
        return {
          ...INITIAL_STATE,
          ...parsed,
          _version: STATE_VERSION,
          // Ensure new v3 arrays exist
          clients: parsed.clients || [],
          clientNotes: parsed.clientNotes || [],
          clientDocuments: parsed.clientDocuments || [],
          clientInvoices: parsed.clientInvoices || [],
          appointments: parsed.appointments || [],
          tagStyles: parsed.tagStyles || {},
          dailyReviews: parsed.dailyReviews || [],
          settings: { dailyCapacityMinutes: 480, ...INITIAL_STATE.settings, ...(parsed.settings || {}) },
        }
      }
    }
  } catch {}
  return INITIAL_STATE
}

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  useEffect(() => {
    try { localStorage.setItem('cockpit_state', JSON.stringify(state)) } catch {}
  }, [state])
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>
}

export function useStore() {
  return useContext(StoreContext)
}

export { nanoid }
