/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic theme colors — backed by CSS variables, swap with data-theme
        base: 'var(--c-base)',
        surface: 'var(--c-surface)',
        card: 'var(--c-card)',
        // accents (unchanged in both themes)
        accent: '#8B7CFF',
        violet: '#8B7CFF',
        green: '#A8E6BD',
        yellow: '#FFD66B',
        orange: '#FFB088',
        red: '#F87171',
        rose: '#FFC1E0',
        blue: '#A8D4F0',
        emerald: '#10B981',
        amber: '#F59E0B',
        pink: '#EC4899',
        cyan: '#7DD3D8',
      },
      fontFamily: {
        sans: ['Geist Variable', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono Variable', '"JetBrains Mono"', '"DM Mono"', 'monospace'],
        heading: ['Geist Variable', 'Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        pulse_ring: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(139,124,255,0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(139,124,255,0)' },
        },
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        slideRight: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        overlayShow: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        contentShow: {
          from: { opacity: '0', transform: 'translate(-50%, -49%) scale(0.97)' },
          to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
        },
        contentHide: {
          from: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
          to: { opacity: '0', transform: 'translate(-50%, -49%) scale(0.97)' },
        },
        sheetIn: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        sheetOut: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(100%)' },
        },
        popIn: {
          from: { opacity: '0', transform: 'scale(0.96) translateY(-2px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        staggerUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        pulse_ring: 'pulse_ring 2s ease-in-out infinite',
        slideUp: 'slideUp 0.2s ease-out',
        slideRight: 'slideRight 0.2s ease-out',
        fadeIn: 'fadeIn 0.15s ease-out',
        overlayShow: 'overlayShow 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        contentShow: 'contentShow 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        contentHide: 'contentHide 0.15s ease-in',
        sheetIn: 'sheetIn 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        sheetOut: 'sheetOut 0.2s ease-in',
        popIn: 'popIn 0.14s cubic-bezier(0.16, 1, 0.3, 1)',
        staggerUp: 'staggerUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      gridTemplateColumns: {
        'hero': '1.4fr 1fr',
        'today': '1.4fr 1fr',
      },
    },
  },
  plugins: [],
}
