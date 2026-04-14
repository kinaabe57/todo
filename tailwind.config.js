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
          50:  '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
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
        sans: ['Inter', '-apple-system', '"SF Pro Text"', '"Helvetica Neue"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs':   ['12px', { lineHeight: '1.5' }],
        'sm':   ['13px', { lineHeight: '1.5' }],
        'base': ['14px', { lineHeight: '1.6' }],
        'lg':   ['16px', { lineHeight: '1.5' }],
        'xl':   ['18px', { lineHeight: '1.4' }],
      },
      boxShadow: {
        'sm':  '0 1px 8px rgba(0,0,0,0.32)',
        DEFAULT: '0 4px 20px rgba(0,0,0,0.40)',
        'md':  '0 6px 24px rgba(0,0,0,0.44)',
        'lg':  '0 12px 40px rgba(0,0,0,0.50)',
        'xl':  '0 20px 60px rgba(0,0,0,0.55)',
        '2xl': '0 32px 80px rgba(0,0,0,0.65)',
        'none': 'none',
      },
      animation: {
        'check-bounce': 'checkBounce 0.45s cubic-bezier(0.16,1,0.3,1)',
        'confetti': 'confetti 1s ease-out forwards',
        'fade-in': 'fadeIn 200ms cubic-bezier(0.16,1,0.3,1)',
      },
      keyframes: {
        checkBounce: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.18)' },
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(-100px) rotate(720deg)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16,1,0.3,1)',
      },
    },
  },
  plugins: [],
}
