/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f1f8ff',
          500: '#0a5dc2',
          700: '#003d87'
        }
      }
    }
  },
  plugins: []
};
