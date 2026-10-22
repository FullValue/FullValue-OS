// Crée un jeton MCP pour un agent (Claude, Codex…) et l'affiche une seule fois.
// Usage : node --env-file=.env.local scripts/create-mcp-token.mjs <email> <libellé>
//   ex :  node --env-file=.env.local scripts/create-mcp-token.mjs moi@exemple.com Claude
import { generateToken, hashToken, serviceClient } from '../server/mcp/auth.js'

const [email, label] = process.argv.slice(2)
if (!email || !label) {
  console.error('Usage : node --env-file=.env.local scripts/create-mcp-token.mjs <email> <libellé>')
  process.exit(1)
}

const db = serviceClient()
const { data: users, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 })
if (listError) throw listError
const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
if (!user) {
  console.error(`Aucun compte Supabase pour ${email}. Crée-le d'abord en te connectant au Cockpit.`)
  process.exit(1)
}

const token = generateToken()
const { error } = await db.from('mcp_tokens').insert({ user_id: user.id, label, token_hash: hashToken(token) })
if (error) throw error

console.log(`Jeton « ${label} » créé. Copie-le maintenant, il ne sera plus affiché :\n\n${token}\n`)
