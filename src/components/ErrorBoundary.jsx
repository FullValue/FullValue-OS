import { Component } from 'react'

// Une erreur dans une page n'emporte plus toute l'application : on affiche un message et on peut réessayer.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Erreur dans la page', error, info?.componentStack)
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Cette page a rencontré une erreur</h2>
        <p className="mt-2 text-sm text-[var(--text-tertiary)]">Tes données ne sont pas touchées. Tu peux réessayer ou changer de page.</p>
        <p className="mt-3 break-words font-mono text-xs text-[var(--text-tertiary)]">{String(this.state.error?.message || this.state.error)}</p>
        <button type="button" onClick={() => this.setState({ error: null })}
          className="mt-5 rounded-full px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--accent)' }}>
          Réessayer
        </button>
      </div>
    )
  }
}
