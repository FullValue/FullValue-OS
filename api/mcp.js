// Fonction Vercel : point d'entrée MCP du Cockpit (POST /api/mcp).
import { handleRpc } from '../server/mcp/protocol.js'
import { resolveContext, serviceClient } from '../server/mcp/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Utilise POST (MCP Streamable HTTP, sans état).' })
  }

  let ctx
  try {
    // Jeton en en-tête (Claude Code, Codex) ou dans l'URL ?key= (connecteurs Claude.ai et ChatGPT, sans en-tête possible).
    const key = typeof req.query?.key === 'string' ? req.query.key : null
    ctx = await resolveContext(req.headers.authorization || (key ? `Bearer ${key}` : ''), serviceClient())
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
  if (!ctx) {
    res.setHeader('WWW-Authenticate', 'Bearer')
    return res.status(401).json({ error: 'Jeton MCP manquant ou invalide.' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch {
      return res.status(400).json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON invalide' } })
    }
  }

  const reply = await handleRpc(body, ctx)
  if (!reply) return res.status(202).end()
  return res.status(200).json(reply)
}
