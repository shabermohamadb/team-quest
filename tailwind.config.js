/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        quest: {
          bg: '#090D16',
          card: '#0F1420',
          cardHover: '#141C2D',
          border: '#1E283D',
          borderLight: '#2C3954',
          accent: '#F59E0B',
        },
        team1: {
          DEFAULT: '#06B6D4',
          light: '#22D3EE',
          dark: '#0891B2',
          bg: '#082F49'
        },
        team2: {
          DEFAULT: '#F59E0B',
          light: '#FBBF24',
          dark: '#D97706',
          bg: '#451A03'
        },
        team3: {
          DEFAULT: '#10B981',
          light: '#34D399',
          dark: '#059669',
          bg: '#064E3B'
        },
        team4: {
          DEFAULT: '#F43F5E',
          light: '#FB7185',
          dark: '#E11D48',
          bg: '#4C0519'
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      keyframes: {
        reveal: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' }
        }
      },
      animation: {
        reveal: 'reveal 0.25s ease-out forwards',
        shake: 'shake 0.4s ease-in-out'
      }
    },
  },
  plugins: [],
}
