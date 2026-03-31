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
          50:  '#e0f4fa',
          100: '#b3e5f5',
          200: '#7dd4ed',
          300: '#44c2e5',
          400: '#18b4de',
          500: '#0095b6',  // iMac Bondi Blue
          600: '#007898',
          700: '#005c78',
          800: '#004058',
          900: '#002438',
        },
        mac: {
          white:  '#ffffff',
          cream:  '#f0f4f8',
          light:  '#e0e8f0',
          chrome: '#c8d4e0',
          mid:    '#a8b8cc',
          border: '#7090b0',
          shadow: '#3a5070',
          dark:   '#1a2a3a',
        }
      },
      borderRadius: {
        'none': '0px',
        'sm':   '3px',
        DEFAULT: '5px',
        'md':   '5px',
        'lg':   '6px',
        'xl':   '8px',
        '2xl':  '10px',
        '3xl':  '12px',
        'full': '9999px',
      },
      fontFamily: {
        sans: ['Geneva', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'xs':   ['14px', { lineHeight: '1.5' }],
        'sm':   ['16px', { lineHeight: '1.5' }],
        'base': ['18px', { lineHeight: '1.5' }],
        'lg':   ['21px', { lineHeight: '1.4' }],
        'xl':   ['24px', { lineHeight: '1.4' }],
      },
      boxShadow: {
        'sm':  '1px 1px 0 rgba(0,0,0,0.2)',
        DEFAULT: '2px 2px 0 rgba(0,0,0,0.25)',
        'md':  '3px 3px 0 rgba(0,0,0,0.28)',
        'lg':  '4px 4px 0 rgba(0,0,0,0.3)',
        'xl':  '4px 4px 0 rgba(0,0,0,0.32)',
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
