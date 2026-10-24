/* eslint-disable react-refresh/only-export-components */
// Deux façons d'entrer : un compte Supabase (synchro entre appareils) ou le mode local
// par code à 4 chiffres (données uniquement dans ce navigateur, utile hors ligne).
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

const ACCESS_KEY = 'cockpit_access_granted'
const ACCESS_CODE = String(import.meta.env.VITE_ACCESS_CODE || '1234')
const LOCAL_USER = {
  id: 'local',
  email: 'Accès local',
  user_metadata: { full_name: 'Marwann' },
  local: true,
}

function hasLocalAccess() {
  try {
    return localStorage.getItem(ACCESS_KEY) === 'true'
  } catch {
    return false
  }
}

export function isAccessCodeValid(code) {
  return /^\d{4}$/.test(code) && code === ACCESS_CODE
}

export function AuthProvider({ children }) {
  // undefined = session en cours de lecture, null = personne de connecté
  const [session, setSession] = useState(undefined)
  const [localAccess, setLocalAccess] = useState(hasLocalAccess)
  // Vrai après un clic sur le lien de réinitialisation : on demande un nouveau mot de passe.
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => setSession(data.session ?? null))
      .catch(() => setSession(null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s ?? null)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Une session Supabase l'emporte toujours sur le mode local.
  const user = session?.user ?? (localAccess ? LOCAL_USER : session === undefined ? undefined : null)

  const signInWithCode = (code) => {
    if (!isAccessCodeValid(code)) return false
    try { localStorage.setItem(ACCESS_KEY, 'true') } catch { /* ignore */ }
    setLocalAccess(true)
    return true
  }

  // Quitter le mode local pour aller vers l'écran de connexion (les données locales restent).
  const leaveLocalMode = () => {
    try { localStorage.removeItem(ACCESS_KEY) } catch { /* ignore */ }
    setLocalAccess(false)
  }

  const signOut = async () => {
    leaveLocalMode()
    if (session) {
      try { await supabase.auth.signOut() } finally { setSession(null) }
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, signOut, signInWithCode, leaveLocalMode, recovering, endRecovery: () => setRecovering(false) }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
