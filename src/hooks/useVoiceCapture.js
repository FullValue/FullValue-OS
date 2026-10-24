// Dictée vocale (Web Speech API, français). Chrome, Edge et Safari récents.
import { useCallback, useEffect, useRef, useState } from 'react'

const Recognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null

export function useVoiceCapture(onResult) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const recRef = useRef(null)
  const cbRef = useRef(onResult)
  useEffect(() => { cbRef.current = onResult })

  const stop = useCallback(() => { recRef.current?.stop() }, [])

  const start = useCallback(() => {
    if (!Recognition || recRef.current) return
    const rec = new Recognition()
    rec.lang = 'fr-FR'
    rec.interimResults = true
    rec.continuous = false
    let finalText = ''
    rec.onresult = e => {
      let text = ''
      for (const r of e.results) {
        if (r.isFinal) finalText += r[0].transcript
        else text += r[0].transcript
      }
      setInterim(finalText + text)
    }
    rec.onerror = e => { if (e.error !== 'no-speech' && e.error !== 'aborted') cbRef.current?.(null, e.error) }
    rec.onend = () => {
      recRef.current = null
      setListening(false)
      setInterim('')
      if (finalText.trim()) cbRef.current?.(finalText.trim())
    }
    recRef.current = rec
    setListening(true)
    rec.start()
  }, [])

  useEffect(() => () => recRef.current?.abort(), [])
  return { supported: !!Recognition, listening, interim, start, stop }
}

// « projet Ulycom » → « #ulycom », « priorité haute » → « !haute » : la syntaxe du quick-add, à l'oral.
export function spokenToQuickAdd(text) {
  return ` ${text} `
    .replace(/\s(?:dans le |pour le )?projet\s+([\p{L}\d-]+)/giu, ' #$1')
    .replace(/\s(?:priorité|impact)\s+(haute|forte|élevée)/giu, ' !haute')
    .replace(/\s(?:priorité|impact)\s+(basse|faible)/giu, ' !basse')
    .trim()
}
