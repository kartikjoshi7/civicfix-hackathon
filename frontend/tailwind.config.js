/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'civic-blue': '#2563eb',
        'civic-red': '#dc2626',
        'civic-green': '#16a34a',
        'civic-yellow': '#f59e0b',
      },
    },
  },
  plugins: [],
}