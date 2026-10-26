// Valeur de métrique traçable : chaque chiffre affiché dit d'où il vient, quand il a été lu,
// sur quelle période et dans quelle devise, et s'il est observé, calculé, estimé ou indisponible.
// Règle d'or : une donnée absente reste null (« Indisponible »), jamais 0.
// Module pur (imports relatifs uniquement) : testé avec `npm test`.

export const STATUS = {
  observed: 'observed',
  computed: 'computed',
  estimated: 'estimated',
  unavailable: 'unavailable',
}

export const STATUS_LABEL = {
  observed: 'Observée',
  computed: 'Calculée',
  estimated: 'Estimée',
  unavailable: 'Indisponible',
}

function base(status, value, meta = {}) {
  return {
    status,
    value,
    source: meta.source ?? null,
    observedAt: meta.observedAt ?? null,
    period: meta.period ?? null,
    currency: meta.currency ?? null,
    note: meta.note ?? null,
    method: meta.method ?? null,
  }
}

const isNum = v => typeof v === 'number' && Number.isFinite(v)

// Valeur lue telle quelle dans une source. Une valeur absente ou invalide devient « Indisponible ».
export function observed(value, meta = {}) {
  if (value === undefined || value === null || (typeof value === 'number' && !Number.isFinite(value))) {
    return unavailable(meta.note || 'Champ absent de la réponse', meta)
  }
  return base(STATUS.observed, value, meta)
}

// Valeur dérivée d'autres valeurs (ex. ancienneté depuis une date de création).
export function computed(value, meta = {}) {
  if (value === undefined || value === null || (typeof value === 'number' && !Number.isFinite(value))) {
    return unavailable(meta.note || 'Calcul impossible : données manquantes', meta)
  }
  return base(STATUS.computed, value, meta)
}

// Valeur issue d'un modèle validé. `method` est obligatoire : pas d'estimation sans méthode documentée.
export function estimated(value, meta = {}) {
  if (!meta.method) throw new Error('Une estimation doit citer sa méthode validée.')
  if (!isNum(value)) return unavailable(meta.note || 'Estimation non disponible', meta)
  return base(STATUS.estimated, value, meta)
}

export function unavailable(reason, meta = {}) {
  return base(STATUS.unavailable, null, { ...meta, note: reason || meta.note || 'Indisponible' })
}

export const isAvailable = m => !!m && m.status !== STATUS.unavailable && m.value !== null && m.value !== undefined

// Valeur numérique pour trier ou filtrer ; null si indisponible (les indisponibles vont en fin de tri).
export const numeric = m => (isAvailable(m) && isNum(m.value) ? m.value : null)

// Montant Etsy (Money) → nombre décimal. null si le montant est inexploitable.
export function moneyToNumber(money) {
  if (!money || !isNum(money.amount) || !isNum(money.divisor) || money.divisor <= 0) return null
  return money.amount / money.divisor
}

export function formatMetric(m, { digits = 0, suffix = '' } = {}) {
  if (!isAvailable(m)) return 'Indisponible'
  if (isNum(m.value)) {
    if (m.currency) return formatMoney(m.value, m.currency)
    return `${m.value.toLocaleString('fr-FR', { maximumFractionDigits: digits })}${suffix}`
  }
  return String(m.value)
}

export function formatMoney(value, currency) {
  if (!isNum(value)) return 'Indisponible'
  try {
    return value.toLocaleString('fr-FR', { style: 'currency', currency, maximumFractionDigits: 2 })
  } catch {
    return `${value.toFixed(2)} ${currency || ''}`.trim()
  }
}

export const formatDateTime = iso => (iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')

// Texte complet du contexte d'une valeur (infobulles).
export function metricDetails(m) {
  if (!m) return ''
  return [
    `Statut : ${STATUS_LABEL[m.status]}`,
    m.source && `Source : ${m.source}`,
    m.observedAt && `Lu le : ${formatDateTime(m.observedAt)}`,
    m.period && `Période : ${m.period}`,
    m.currency && `Devise : ${m.currency}`,
    m.method && `Méthode : ${m.method}`,
    m.note && `Note : ${m.note}`,
  ].filter(Boolean).join('\n')
}
