/* eslint-disable react-refresh/only-export-components */
// Messages WhatsApp Business de l'utilisateur connecté : chargement, temps réel, envoi, lu / non lu.
// Les messages sont écrits côté serveur (webhook Meta, /api/whatsapp/send, MCP) dans wa_messages.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { summarizeConversations } from '@/lib/whatsapp'

const WhatsAppContext = createContext({ status: 'local', conversations: [], messages: [], unread: 0 })
const HISTORY_DAYS = 60

export function WhatsAppProvider({ children }) {
  const { session } = useAuth()
  const userId = session?.user?.id
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('loading')
  const [openPhone, setOpenPhone] = useState(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const since = new Date(Date.now() - HISTORY_DAYS * 86400000).toISOString()
    supabase.from('wa_messages').select('*').eq('user_id', userId).gte('created_at', since)
      .order('created_at', { ascending: false }).limit(2000)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { setStatus(/wa_messages/.test(error.message) ? 'no-table' : 'error'); return }
        setMessages(data)
        setStatus('ready')
      })
    const channel = supabase
      .channel(`wa_messages:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wa_messages', filter: `user_id=eq.${userId}` }, ({ new: row }) => {
        if (!row?.id) return
        setMessages(list => [row, ...list.filter(m => m.id !== row.id)])
      })
      .subscribe()
    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [userId])

  const conversations = useMemo(
    () => summarizeConversations(messages).sort((a, b) => new Date(b.last.created_at) - new Date(a.last.created_at)),
    [messages],
  )

  const send = useCallback(async (to, text) => {
    const res = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ to, text }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || `Envoi impossible (${res.status}).`)
    setMessages(list => [json.message, ...list.filter(m => m.id !== json.message.id)])
    return json.message
  }, [session])

  const markRead = useCallback(async (phone) => {
    const now = new Date().toISOString()
    const ids = messages.filter(m => m.contact_phone === phone && m.direction === 'in' && !m.read_at).map(m => m.id)
    if (!ids.length) return
    setMessages(list => list.map(m => (ids.includes(m.id) ? { ...m, read_at: now } : m)))
    await supabase.from('wa_messages').update({ read_at: now }).in('id', ids)
  }, [messages])

  const value = {
    status: userId ? status : 'local',
    messages,
    conversations,
    unread: conversations.reduce((sum, c) => sum + c.unread, 0),
    send,
    markRead,
    openPhone,
    setOpenPhone,
  }
  return <WhatsAppContext.Provider value={value}>{children}</WhatsAppContext.Provider>
}

export function useWhatsApp() {
  return useContext(WhatsAppContext)
}
