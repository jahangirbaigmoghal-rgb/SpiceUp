/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          50: 'var(--brand-50, #fff7ed)',
          100: 'var(--brand-100, #ffedd5)',
          200: 'var(--brand-200, #fed7aa)',
          300: 'var(--brand-300, #fdba74)',
          400: 'var(--brand-400, #fb923c)',
          500: 'var(--brand-500, #f97316)',
          600: 'var(--brand-600, #ea580c)',
          700: 'var(--brand-700, #c2410c)',
          800: 'var(--brand-800, #9a3412)',
          900: 'var(--brand-900, #7c2d12)',
          950: 'var(--brand-950, #431407)',
        },
      },
      keyframes: {
        'ping-slow': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
      },
      animation: {
        'ping-slow': 'ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
}
