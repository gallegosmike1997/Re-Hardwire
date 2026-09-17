/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './state/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Structural surfaces - deep "hardwired board" look
        void: '#05070a',
        ink: '#0b1017',
        panel: '#111823',
        panelsoft: '#161f2c',
        edge: '#1e2937',
        edgesoft: '#2a3646',
        // Signal accents
        signal: {
          50: '#ecfeff',
          100: '#cff9fe',
          200: '#a5f1fc',
          300: '#67e4f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        pulse: {
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        // Semantic states
        win: '#34d399',
        warmth: '#fbbf24',
        alarm: '#f87171',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 12px 32px -12px rgba(0,0,0,0.9)',
        glow: '0 0 0 1px rgba(34,211,238,0.35), 0 0 24px -4px rgba(34,211,238,0.35)',
        'glow-pulse': '0 0 0 1px rgba(167,139,250,0.35), 0 0 24px -4px rgba(167,139,250,0.35)',
      },
      backgroundImage: {
        grid: 'linear-gradient(to right, rgba(30,41,55,0.55) 1px, transparent 1px), linear-gradient(to bottom, rgba(30,41,55,0.55) 1px, transparent 1px)',
        sheen:
          'radial-gradient(120% 120% at 0% 0%, rgba(34,211,238,0.10) 0%, rgba(5,7,10,0) 55%)',
      },
      backgroundSize: {
        grid: '32px 32px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(34,211,238,0.45)' },
          '70%': { boxShadow: '0 0 0 12px rgba(34,211,238,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(34,211,238,0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.25' },
        },
        sweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 240ms ease-out both',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        blink: 'blink 1.4s ease-in-out infinite',
        sweep: 'sweep 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};