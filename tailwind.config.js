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
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"DM Mono"', 'monospace'],
        heading: ['Inter', 'sans-serif'],
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
      },
      animation: {
        pulse_ring: 'pulse_ring 2s ease-in-out infinite',
        slideUp: 'slideUp 0.2s ease-out',
        slideRight: 'slideRight 0.2s ease-out',
        fadeIn: 'fadeIn 0.15s ease-out',
      },
      gridTemplateColumns: {
        'hero': '1.4fr 1fr',
        'today': '1.4fr 1fr',
      },
    },
  },
  plugins: [],
}
