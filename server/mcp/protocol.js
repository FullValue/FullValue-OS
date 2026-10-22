// Implémentation minimale du protocole MCP (JSON-RPC 2.0) en HTTP « streamable »
// sans état : chaque POST reçoit une réponse JSON, aucune session n'est gardée.
import { TOOLS } from './tools.js'

const SUPPORTED_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05']

const INSTRUCTIONS = `Tu es connecté au Cockpit, l'OS personnel de Marwann (open space de pilotage).
Les pôles (Ulycom, Yoovi, E-commerce…) contiennent des clients, qui ont des projets clients avec des tâches.
Les demandes servent à solliciter des prestataires. Réponds en français.
Commence par « tableau_de_bord » si tu as besoin de contexte. Chaque modification est tracée dans le journal d'activité à ton nom.`

const toolsById = new Map(TOOLS.map(t => [t.name, t]))

function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } }
}

function missingRequired(tool, args) {
  return (tool.inputSchema.required || []).filter(k => args[k] === undefined || args[k] === null || args[k] === '')
}

async function handleOne(msg, ctx) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
    return rpcError(msg?.id, -32600, 'Requête JSON-RPC invalide')
  }
  // Les notifications (sans id) n'appellent pas de réponse.
  if (msg.id === undefined) return null

  const { id, method, params = {} } = msg
  switch (method) {
    case 'initialize': {
      const requested = params.protocolVersion
      return {
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'cockpit', version: '0.1.0' },
          instructions: INSTRUCTIONS,
        },
      }
    }
    case 'ping':
      return { jsonrpc: '2.0', id, result: {} }
    case 'tools/list':
      return {
        jsonrpc: '2.0', id,
        result: { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) },
      }
    case 'tools/call': {
      const tool = toolsById.get(params.name)
      if (!tool) return rpcError(id, -32602, `Outil inconnu : ${params.name}`)
      const args = params.arguments || {}
      const missing = missingRequired(tool, args)
      if (missing.length) {
        return { jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: `Champs requis manquants : ${missing.join(', ')}` }] } }
      }
      try {
        const data = await tool.run(args, ctx)
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] } }
      } catch (err) {
        return { jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: `Erreur : ${err.message}` }] } }
      }
    }
    default:
      return rpcError(id, -32601, `Méthode non prise en charge : ${method}`)
  }
}

// Renvoie la réponse à envoyer, ou null si le message ne contenait que des notifications.
export async function handleRpc(body, ctx) {
  if (Array.isArray(body)) {
    const replies = (await Promise.all(body.map(m => handleOne(m, ctx)))).filter(Boolean)
    return replies.length ? replies : null
  }
  return handleOne(body, ctx)
}
