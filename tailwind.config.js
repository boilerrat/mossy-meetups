/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  corePlugins: {
    // Disable Tailwind's CSS reset so it doesn't conflict with existing styled-jsx page styles
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
}
