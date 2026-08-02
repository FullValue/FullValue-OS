/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

const ACCESS_KEY = 'cockpit_access_granted'
const ACCESS_CODE = String(import.meta.env.VITE_ACCESS_CODE || '1234')
const GUEST_USER = {
  id: 'local',
  email: 'Invité',
  user_metadata: { full_name: 'Marwann' },
  guest: true,
}

function hasAccess() {
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
  const [user, setUser] = useState(() => (hasAccess() ? GUEST_USER : null))

  const signInWithCode = (code) => {
    if (!isAccessCodeValid(code)) return false
    try { localStorage.setItem(ACCESS_KEY, 'true') } catch { /* ignore */ }
    setUser(GUEST_USER)
    return true
  }

  const signOut = () => {
    try { localStorage.removeItem(ACCESS_KEY) } catch { /* ignore */ }
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, signOut, signInWithCode }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
