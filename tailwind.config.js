
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Montserrat', 'sans-serif'],
      },
      colors: { 
        primary: '#1e293b',
        accent: '#10b981',
        brand: '#1e293b',
        gold: '#d97706'
      }
    },
  },
  plugins: [],
}
