// Accès MCP au store du Cockpit : le document JSONB user_state (celui que l'app synchronise).
// Écriture optimiste : on ne remplace la ligne que si personne ne l'a modifiée entre-temps,
// sinon on relit et on rejoue la modification. L'app reçoit le changement en temps réel.
import { randomBytes } from 'node:crypto'

export const MCP_CLIENT_ID = 'mcp'

export function newId() {
  return randomBytes(6).toString('base64url').slice(0, 8)
}

export async function readState(ctx) {
  const { data, error } = await ctx.db.from('user_state').select('state, updated_at').eq('user_id', ctx.userId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error("Aucune donnée synchronisée : ouvre le Cockpit connecté à ton compte une première fois.")
  return data
}

// `fn(state)` modifie une copie du state et renvoie le résultat de l'outil.
export async function mutateState(ctx, fn, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    const row = await readState(ctx)
    const state = structuredClone(row.state)
    const result = fn(state)
    const { data, error } = await ctx.db.from('user_state')
      .update({ state, client_id: MCP_CLIENT_ID, updated_at: new Date().toISOString() })
      .eq('user_id', ctx.userId).eq('updated_at', row.updated_at)
      .select('user_id')
    if (error) throw new Error(error.message)
    if (data?.length) return result
  }
  throw new Error('Le Cockpit est en train d’écrire : réessaie dans quelques secondes.')
}

export function findById(list, id, label) {
  const item = (list || []).find(x => x.id === id)
  if (!item) throw new Error(`${label} introuvable : ${id}`)
  return item
}
