/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', 'Inter', 'sans-serif'],
      },
      colors: {
        apple: {
          blue: '#0071E3',
          emerald: '#34C759',
          amber: '#FF9F0A',
          red: '#FF3B30',
          indigo: '#5856D6',
        }
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'apple-card': '0 2px 12px -4px rgba(0,0,0,0.08)',
        'apple-card-hover': '0 4px 20px -4px rgba(0,0,0,0.12)',
      },
      backdropBlur: {
        xl: '20px',
      },
    },
  },
  plugins: [],
}

