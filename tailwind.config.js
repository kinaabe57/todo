/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
      },
      borderRadius: {
        'none': '0px',
        'sm':   '6px',
        DEFAULT: '10px',
        'md':   '10px',
        'lg':   '12px',
        'xl':   '16px',
        '2xl':  '20px',
        '3xl':  '24px',
        'full': '9999px',
      },
      fontFamily: {
        sans: ['-apple-system', '"SF Pro Text"', '"Helvetica Neue"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs':   ['12px', { lineHeight: '1.5' }],
        'sm':   ['13px', { lineHeight: '1.5' }],
        'base': ['14px', { lineHeight: '1.6' }],
        'lg':   ['16px', { lineHeight: '1.5' }],
        'xl':   ['18px', { lineHeight: '1.4' }],
      },
      boxShadow: {
        'sm':  '0 2px 8px rgba(0,0,0,0.35)',
        DEFAULT: '0 4px 20px rgba(0,0,0,0.4)',
        'md':  '0 6px 24px rgba(0,0,0,0.45)',
        'lg':  '0 12px 40px rgba(0,0,0,0.5)',
        'xl':  '0 20px 60px rgba(0,0,0,0.55)',
        '2xl': '0 32px 80px rgba(0,0,0,0.65)',
        'none': 'none',
      },
      animation: {
        'check-bounce': 'checkBounce 0.5s ease-in-out',
        'confetti': 'confetti 1s ease-out forwards',
      },
      keyframes: {
        checkBounce: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(-100px) rotate(720deg)', opacity: '0' },
        }
      }
    },
  },
  plugins: [],
}
