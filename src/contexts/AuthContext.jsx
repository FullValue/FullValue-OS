import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

// Accès invité — court-circuite Supabase (utile si le projet Supabase est en pause /
// l'auth indisponible). Les données de l'app vivent dans localStorage, donc l'invité
// retombe sur les données déjà présentes sur cet appareil.
const GUEST_KEY = 'cockpit_guest'
const GUEST_USER = {
  id: 'guest',
  email: 'Invité',
  user_metadata: { full_name: 'Marwann' },
  guest: true,
}

function isGuest() {
  try {
    return localStorage.getItem(GUEST_KEY) === 'true'
  } catch {
    return false
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading, null = no user

  useEffect(() => {
    // Mode invité : on ne touche pas à Supabase.
    if (isGuest()) {
      setUser(GUEST_USER)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isGuest()) return
      setUser(session?.user ?? null)
    }).catch(() => setUser(null))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isGuest()) return
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInAsGuest = () => {
    try { localStorage.setItem(GUEST_KEY, 'true') } catch { /* ignore */ }
    setUser(GUEST_USER)
  }

  const signOut = async () => {
    if (isGuest()) {
      try { localStorage.removeItem(GUEST_KEY) } catch { /* ignore */ }
      setUser(null)
      return
    }
    try {
      await supabase.auth.signOut()
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, signOut, signInAsGuest }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
