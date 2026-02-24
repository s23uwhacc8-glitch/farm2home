/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'farm-green':      '#16a34a',
        'farm-dark-green': '#15803d',
        'farm-light':      '#4ade80',
      },
      fontFamily: {
        sans:    ['DM Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Outfit', 'DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
