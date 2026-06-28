/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/popup/**/*.{tsx,ts,html}',
    './src/options/**/*.{tsx,ts,html}',
    './src/dashboard/**/*.{tsx,ts,html}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#00E5A0',
          dark: '#060910',
        },
      },
    },
  },
  plugins: [],
}
