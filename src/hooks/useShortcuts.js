import { useEffect, useRef } from 'react'

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

const GO_MAP = {
  j: 'journee',
  i: 'inbox',
  c: 'calendrier',
  t: 'taches',
  s: 'sessions',
  p: 'projets',
  u: 'ulycom_clients',
  r: 'hub-ressources',
  f: 'formation',
}

/**
 * Raccourcis globaux :
 *   ⌘K / Ctrl+K   → palette
 *   N ou C        → palette (création/capture)
 *   ?             → aide raccourcis
 *   G puis lettre → navigation (voir GO_MAP)
 *
 * Ignorés pendant la saisie (input/textarea/contenteditable) et
 * quand un dialogue est ouvert (hors ⌘K qui bascule la palette).
 */
export function useShortcuts(handlers) {
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(() => {
    let pendingG = false
    let timer = null

    function isTyping(e) {
      const el = e.target
      return el && (TYPING_TAGS.has(el.tagName) || el.isContentEditable)
    }

    function dialogOpen() {
      return !!document.querySelector('[role="dialog"][data-state="open"]')
    }

    function onKeyDown(e) {
      const h = ref.current

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        h.togglePalette?.()
        return
      }

      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey || dialogOpen()) {
        pendingG = false
        return
      }

      const key = e.key.toLowerCase()

      if (pendingG) {
        pendingG = false
        clearTimeout(timer)
        const page = GO_MAP[key]
        if (page) {
          e.preventDefault()
          h.navigate?.(page)
          return
        }
      }

      if (key === 'g') {
        pendingG = true
        clearTimeout(timer)
        timer = setTimeout(() => {
          pendingG = false
        }, 900)
        return
      }

      if (e.key === '?') {
        e.preventDefault()
        h.openShortcuts?.()
        return
      }

      if (key === 'n' || key === 'c') {
        e.preventDefault()
        h.openPalette?.()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      clearTimeout(timer)
    }
  }, [])
}
