const plugin = require('tailwindcss/plugin')

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        print: { raw: 'print' },
        screen: { raw: 'screen' }
      },
      fontFamily: {
        sans: '"Inter", sans-serif'
      },
      colors: {
        blue: {
          100: '#50B2DF',
          200: '#0B8CC5',
          300: '#1C62B6',
          400: '#18539B',
          900: '#002D3C',
          950: '#00101C'
        },
        yellow: {
          100: '#FFEE66',
          200: '#FFE459',
          400: '#FFD13E',
          500: '#E2B72A',
          600: '#C49C15',
          750: '#A78201'
        }
      }
    },
    plugins: [
      plugin(({ matchUtilities }) => {
        matchUtilities({
          perspective: (value) => ({
            perspective: value
          })
        })
      })
    ]
  }
}
