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
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
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
    },
  },
  plugins: [],
}
