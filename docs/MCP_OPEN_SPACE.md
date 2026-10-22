# Open space + serveur MCP

Fondations de l'open space : pôles → clients → projets clients → tâches, demandes aux prestataires, et un serveur MCP pour que Claude et Codex agissent dessus.

## Ce qui existe

| Élément | Fichier |
|---|---|
| Schéma (projets clients, membres, demandes, messages, journal, jetons) + RLS + temps réel | `supabase/migrations/005_open_space.sql` |
| Endpoint MCP (Vercel, `POST /api/mcp`) | `api/mcp.js` |
| Protocole JSON-RPC MCP sans état | `server/mcp/protocol.js` |
| Outils | `server/mcp/tools.js` |
| Jetons (hash SHA-256, client service role) | `server/mcp/auth.js` |
| Création d'un jeton | `scripts/create-mcp-token.mjs` |

Les **pôles** réutilisent la table `projects` (Ulycom, Yoovi, E-commerce). Un prestataire est un `profile` avec `role = 'prestataire'`. Il voit uniquement les projets clients dont il est membre (`project_members`) et les demandes qui lui sont adressées.

## Mise en route

1. **Créer un nouveau projet Supabase.** L'ancien (`dbybne…supabase.co`) n'existe plus : son nom de domaine ne résout plus.
2. Dans l'éditeur SQL, exécuter dans l'ordre `001` → `005` de `supabase/migrations/`.
3. Variables d'environnement (`.env.local` et Vercel) :
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` : côté navigateur.
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` : **côté serveur uniquement**. Ne jamais préfixer la clé service role par `VITE_`, sinon elle partirait dans le bundle.
4. Créer ton compte (connexion Supabase dans l'app), puis générer un jeton par agent :
   ```bash
   node --env-file=.env.local scripts/create-mcp-token.mjs ton@email.com Claude
   node --env-file=.env.local scripts/create-mcp-token.mjs ton@email.com Codex
   ```
   Le libellé (`Claude`, `Codex`) est le nom affiché dans le journal d'activité et sur les demandes (`created_via = 'mcp:Claude'`).

## Brancher les agents

**Claude Code**
```bash
claude mcp add --transport http cockpit https://<ton-domaine>/api/mcp --header "Authorization: Bearer ckpt_..."
```

**Codex** (`~/.codex/config.toml`)
```toml
[mcp_servers.cockpit]
url = "https://<ton-domaine>/api/mcp"
bearer_token_env_var = "COCKPIT_MCP_TOKEN"
```
Ensuite, exporter `COCKPIT_MCP_TOKEN=ckpt_...` dans ton shell.

**Claude.ai (web / desktop)** : les connecteurs personnalisés y passent par OAuth et non par un jeton Bearer. Ce sera une étape ultérieure.

## Outils

`tableau_de_bord`, `lister_poles`, `lister_clients`, `lister_projets_clients`, `creer_projet_client`, `modifier_projet_client`, `lister_taches`, `creer_tache`, `modifier_tache`, `lister_prestataires`, `envoyer_demande`, `lister_demandes`, `lire_demande`, `repondre_demande`, `journal_activite`.

Chaque écriture est tracée dans `activity_log` au nom de l'agent. Le serveur utilise la clé service role, donc **chaque requête filtre sur l'utilisateur du jeton** et vérifie que les ids reçus lui appartiennent.

## Pas encore fait

- L'app lit encore le `localStorage`. Tant que la synchro app ↔ Supabase n'existe pas, ce que font les agents n'apparaît pas dans l'interface.
- La connexion Supabase n'est pas encore rétablie dans l'app : l'accès se fait toujours par code à 4 chiffres.
- Invitation d'un prestataire (création de compte + email) et notification par email des demandes.
- L'open space 3D lui-même.
