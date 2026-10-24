import { northStarOf } from '@/lib/goals'

// Calcule la disposition de l'open space à partir du store local.
// Fonctions pures : aucune dépendance à three, testables à part.

// Hauteur du plateau surélevé des pôles : postes et tableaux sont posés dessus.
export const PLATFORM_H = 0.14
const DESK_DX = 2.7
const DESK_DZ = 2.6
const DESKS_PER_ROW = 3
const ZONE_PAD = 1.2
const ZONE_GAP = 2
const ZONES_PER_ROW = 3
const MAX_TASK_DESKS = 6

export const AGENTS = [
  { id: 'claude', name: 'Claude', color: '#D97757' },
  { id: 'codex',  name: 'Codex',  color: '#10A37F' },
]

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const isOverdue = (t, today) => t.status !== 'done' && t.dueDate && t.dueDate < today

function clientPoleId(projects) {
  const ulycom = projects.find(p => /ulycom/i.test(p.name))
  return (ulycom || projects.find(p => p.id === 'p1'))?.id ?? null
}

function shorten(text, max = 22) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text
}

// Postes d'un pôle : les clients actifs pour le pôle agence, sinon les tâches ouvertes.
function postsForPole(pole, state, clientsPole) {
  const today = todayStr()
  if (pole.id === clientsPole) {
    return state.clients
      .filter(c => c.status !== 'archived')
      .map(c => {
        const open = state.tasks.filter(t => t.clientId === c.id && t.status !== 'done')
        return {
          id: `client:${c.id}`, kind: 'client', refId: c.id,
          label: c.shortName || c.name, sublabel: `${open.length} tâche${open.length > 1 ? 's' : ''}`,
          color: c.accentColor || pole.color, busy: open.some(t => t.status === 'inprogress'),
          overdue: open.some(t => isOverdue(t, today)),
        }
      })
  }
  return state.tasks
    .filter(t => t.projectId === pole.id && !t.clientId && t.status !== 'done')
    .sort((a, b) => (b.status === 'inprogress') - (a.status === 'inprogress') || (b.impact === 'high') - (a.impact === 'high'))
    .slice(0, MAX_TASK_DESKS)
    .map(t => ({
      id: `task:${t.id}`, kind: 'task', refId: t.id,
      label: shorten(t.title), sublabel: t.status === 'inprogress' ? 'En cours' : 'À faire',
      color: t.impact === 'high' ? '#FF8FA3' : pole.color, busy: t.status === 'inprogress',
      overdue: isOverdue(t, today),
    }))
}

export function buildLayout(state) {
  const clientsPole = clientPoleId(state.projects)
  const sized = state.projects.map(rawPole => {
    const pole = { ...rawPole, northStarProgress: northStarOf(rawPole, state).pct }
    const posts = postsForPole(pole, state, clientsPole)
    const rows = Math.max(1, Math.ceil(posts.length / DESKS_PER_ROW))
    return {
      pole, posts,
      w: DESKS_PER_ROW * DESK_DX + ZONE_PAD * 2,
      d: rows * DESK_DZ + ZONE_PAD * 2 + 1.4, // +1.4 : tableau North Star au fond
    }
  })

  // Rangées de zones, centrées sur x = 0, empilées vers -z
  const zones = []
  let zCursor = -2
  for (let i = 0; i < sized.length; i += ZONES_PER_ROW) {
    const row = sized.slice(i, i + ZONES_PER_ROW)
    const rowW = row.reduce((s, z) => s + z.w, 0) + ZONE_GAP * (row.length - 1)
    const rowD = Math.max(...row.map(z => z.d))
    let x = -rowW / 2
    for (const z of row) {
      const cx = x + z.w / 2
      const cz = zCursor - rowD / 2
      const desks = z.posts.map((post, k) => ({
        ...post,
        poleId: z.pole.id,
        position: [
          cx - DESK_DX + (k % DESKS_PER_ROW) * DESK_DX,
          PLATFORM_H,
          cz + z.d / 2 - ZONE_PAD - DESK_DZ / 2 - Math.floor(k / DESKS_PER_ROW) * DESK_DZ + 0.2,
        ],
      }))
      zones.push({
        id: `pole:${z.pole.id}`, pole: z.pole, center: [cx, cz], size: [z.w, z.d], desks,
        boardPosition: [cx, PLATFORM_H, cz - z.d / 2 + 0.5],
        isClientsPole: z.pole.id === clientsPole,
      })
      x += z.w + ZONE_GAP
    }
    zCursor -= rowD + ZONE_GAP
  }

  // Espaces communs devant les pôles
  const commons = {
    hub:     { id: 'hub',     position: [0, 0, 3.5] },
    agents:  { id: 'agents',  position: [-9, 0, 4], desks: AGENTS.map((a, k) => ({ ...a, position: [-10.4 + k * 2.8, 0, 4] })) },
    meeting: { id: 'meeting', position: [9.5, 0, 4], size: [6.5, 5] },
  }

  const minZ = zCursor + ZONE_GAP
  const maxW = Math.max(26, ...zones.map(z => Math.abs(z.center[0]) * 2 + z.size[0]))
  return { zones, commons, bounds: { w: maxW + 6, minZ: minZ - 2, maxZ: 8 } }
}

export function findEntity(layout, id) {
  if (!id) return null
  for (const zone of layout.zones) {
    if (zone.id === id) return { type: 'pole', zone }
    const desk = zone.desks.find(d => d.id === id)
    if (desk) return { type: desk.kind, desk, zone }
  }
  if (id.startsWith('agent:')) return { type: 'agent', agent: layout.commons.agents.desks.find(a => `agent:${a.id}` === id) }
  if (id === 'hub') return { type: 'hub' }
  if (id === 'meeting') return { type: 'meeting' }
  return null
}
