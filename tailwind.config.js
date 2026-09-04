/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#FAF8F5',
          card: '#FFFFFF',
          border: '#E0E0E0',
          text: {
            primary: '#212121',
            secondary: '#6C757D'
          },
          brand: {
            primary: '#1976D2',
            secondary: '#FBC02D'
          },
          status: {
            success: '#2E7D32',
            critical: '#C62828',
            moderate: '#F57C00',
            minor: '#B0BEC5'
          }
        }
      }
    },
  },
  plugins: [],
}
