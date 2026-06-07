/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        kx: {
          base: 'rgb(var(--kx-bg) / <alpha-value>)',
          elevated: 'rgb(var(--kx-bg-elevated) / <alpha-value>)',
          fg: 'rgb(var(--kx-fg) / <alpha-value>)',
          'brand-from': 'rgb(var(--kx-brand-from) / <alpha-value>)',
          'brand-to': 'rgb(var(--kx-brand-to) / <alpha-value>)',
          'brand-accent': 'rgb(var(--kx-brand-accent) / <alpha-value>)',
          'brand-strong': 'rgb(var(--kx-brand-strong) / <alpha-value>)',
          'accent-warm': 'rgb(var(--kx-accent-warm) / <alpha-value>)',
          'accent-warm-strong': 'rgb(var(--kx-accent-warm-strong) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      animation: {
        'slide-in': 'slide-in 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
