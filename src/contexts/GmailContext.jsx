/* eslint-disable react-refresh/only-export-components */
// Connexion Gmail en lecture seule via Google Identity Services (OAuth côté navigateur).
// Le jeton d'accès (1 h) reste dans sessionStorage ; rien n'est envoyé ailleurs que chez Google.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
const API = 'https://gmail.googleapis.com/gmail/v1/users/me'
const TOKEN_KEY = 'cockpit:gmail-token'
const LINKED_KEY = 'cockpit:gmail-linked'
const IMPORTANT_QUERY = 'is:unread is:important newer_than:14d -category:promotions -category:social'
const REFRESH_MS = 5 * 60 * 1000

const GmailContext = createContext(null)

function readToken() {
  try {
    const t = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null')
    return t && t.expiresAt > Date.now() + 30000 ? t : null
  } catch { return null }
}

let gisPromise = null
function loadGis() {
  gisPromise ||= new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve()
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => { gisPromise = null; reject(new Error('Impossible de charger Google Identity Services.')) }
    document.head.appendChild(script)
  })
  return gisPromise
}

function header(headers, name) {
  return headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || ''
}

// « Jean Dupont <jean@x.fr> » → { name: 'Jean Dupont', email: 'jean@x.fr' }
function parseFrom(from) {
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>/.exec(from)
  return m ? { name: m[1].trim() || m[2], email: m[2] } : { name: from, email: from }
}

export function GmailProvider({ children }) {
  const [token, setToken] = useState(readToken)
  const [linked, setLinked] = useState(() => { try { return !!localStorage.getItem(LINKED_KEY) } catch { return false } })
  const [account, setAccount] = useState(null)
  const [messages, setMessages] = useState([])
  const [inboxUnread, setInboxUnread] = useState(0)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const clientRef = useRef(null)

  const status = !CLIENT_ID ? 'unconfigured' : token ? 'connected' : linked ? 'expired' : 'disconnected'

  const call = useCallback(async (path) => {
    const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token.accessToken}` } })
    if (res.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY)
      setToken(null)
      throw new Error('Session Gmail expirée : reconnecte-toi.')
    }
    if (!res.ok) throw new Error(`Gmail a répondu ${res.status}.`)
    return res.json()
  }, [token])

  const refresh = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [profile, inbox, list] = await Promise.all([
        call('/profile'),
        call('/labels/INBOX'),
        call(`/messages?maxResults=8&q=${encodeURIComponent(IMPORTANT_QUERY)}`),
      ])
      const details = await Promise.all((list.messages || []).map(m =>
        call(`/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`)
      ))
      setAccount(profile.emailAddress)
      setInboxUnread(inbox.messagesUnread || 0)
      setMessages(details.map(d => {
        const from = parseFrom(header(d.payload?.headers, 'From'))
        return {
          id: d.id,
          threadId: d.threadId,
          from: from.name,
          fromEmail: from.email,
          subject: header(d.payload?.headers, 'Subject') || '(sans objet)',
          snippet: d.snippet,
          date: Number(d.internalDate),
          // authuser choisit le bon compte Google ; #all trouve le fil même s'il est archivé.
          url: `https://mail.google.com/mail/?authuser=${encodeURIComponent(profile.emailAddress)}#all/${d.threadId}`,
        }
      }))
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, call])

  useEffect(() => {
    if (!token) return
    const first = setTimeout(refresh, 0)
    const t = setInterval(refresh, REFRESH_MS)
    return () => { clearTimeout(first); clearInterval(t) }
  }, [token, refresh])

  // Doit être appelé depuis un clic : Google ouvre une fenêtre de consentement.
  const connect = useCallback(async () => {
    if (!CLIENT_ID) return
    setError(null)
    try {
      await loadGis()
      clientRef.current ||= window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: resp => {
          if (resp.error) { setError(`Connexion refusée (${resp.error}).`); return }
          const t = { accessToken: resp.access_token, expiresAt: Date.now() + Number(resp.expires_in) * 1000 }
          sessionStorage.setItem(TOKEN_KEY, JSON.stringify(t))
          localStorage.setItem(LINKED_KEY, '1')
          setLinked(true)
          setToken(t)
        },
      })
      clientRef.current.requestAccessToken({ prompt: linked ? '' : 'consent' })
    } catch (err) {
      setError(err.message)
    }
  }, [linked])

  const disconnect = useCallback(() => {
    if (token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(token.accessToken, () => {})
    sessionStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(LINKED_KEY)
    setToken(null)
    setLinked(false)
    setAccount(null)
    setMessages([])
    setInboxUnread(0)
  }, [token])

  return (
    <GmailContext.Provider value={{ status, account, messages, inboxUnread, error, loading, connect, disconnect, refresh }}>
      {children}
    </GmailContext.Provider>
  )
}

export function useGmail() {
  const ctx = useContext(GmailContext)
  if (!ctx) throw new Error('useGmail must be used inside GmailProvider')
  return ctx
}
