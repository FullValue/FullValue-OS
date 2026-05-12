# Supabase Setup Guide — Le Cockpit

## 1. Créer le projet

1. Va sur **https://supabase.com** → Sign up / Sign in
2. Clique **New project**
3. Choisis :
   - Organisation : ton compte
   - Name : `le-cockpit`
   - Database password : génère un mot de passe fort (conserve-le)
   - Region : **Frankfurt (eu-central-1)** ou Paris
4. Attends 1–2 minutes que le projet se déploie

---

## 2. Récupérer les credentials

Dans ton projet Supabase, va dans **Settings → API** :

| Variable | Où la trouver |
|---|---|
| `VITE_SUPABASE_URL` | "Project URL" (ex: `https://abcdef.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | "Project API keys → anon public" |

> ⚠️ La `service_role key` n'est PAS utilisée dans cette app (SPA Vite = pas de serveur). Ne l'expose jamais côté client.

---

## 3. Configurer les variables d'environnement

Crée un fichier `.env.local` à la racine du projet :

```bash
VITE_SUPABASE_URL=https://abcdef.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> `.env.local` est déjà dans le `.gitignore`. Ne commit jamais ce fichier.

---

## 4. Exécuter les migrations SQL

Dans Supabase, va dans **SQL Editor** et exécute dans l'ordre :

1. `supabase/migrations/001_initial.sql` — Crée toutes les tables + triggers
2. `supabase/migrations/002_rls_policies.sql` — Active la sécurité (RLS) sur toutes les tables

> Pour exécuter : copie le contenu du fichier, colle dans l'éditeur SQL, clique **Run**.

---

## 5. Configurer les emails Supabase

Dans **Authentication → Email Templates** :

- **Confirm signup** : personnalise le texte (optionnel)
- **Reset password** : personnalise le texte (optionnel)
- **Redirect URL** : dans **Authentication → URL Configuration**, ajoute `http://localhost:5173` en développement

---

## 6. Premier lancement

1. Lance l'app en dev : `npm run dev`
2. Va sur `http://localhost:5173`
3. Tu devrais voir la page de connexion
4. Crée un compte → tu recevras un email de confirmation
5. Clique le lien dans l'email
6. Connecte-toi
7. Va sur `/migrate` (via le menu ou l'URL directement) pour importer tes données localStorage → Supabase
8. La migration est one-shot. Une fois faite, toutes les données viennent de Supabase.

---

## Commandes utiles

```bash
# Lancer en développement
npm run dev

# Build production
npm run build
```

---

## Architecture de l'auth (Vite SPA)

Contrairement à Next.js, cette app est une SPA Vite sans middleware serveur.  
La protection des routes est gérée côté client dans `App.jsx` :

- Si **non connecté** → affiche Login / Signup / Forgot Password
- Si **connecté** → affiche l'app complète avec navbar + sidebar

La session Supabase est persistée automatiquement dans localStorage par le client Supabase.
