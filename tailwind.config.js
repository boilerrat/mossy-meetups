/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  corePlugins: {
    // Disable Tailwind's CSS reset so it doesn't conflict with existing styled-jsx page styles
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        'moss-base':       '#F3F6F1',
        'moss-surface':    '#FFFFFF',
        'moss-text':       '#1A1A18',
        'moss-pinecone':   '#5B3A2E',
        'moss-forest':     '#2E7D32',
        'moss-green':      '#6A9A4F',
        'moss-cta':        '#D97706',
        'moss-cta-hover':  '#E4A11B',
        'moss-cream':      '#f3ebdc',
        'moss-gold':       '#d7b97f',
        'moss-dark':       '#10231d',
        'moss-darker':     '#07100d',
        'moss-card':       'rgba(13, 28, 23, 0.74)',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card:  '28px',
        input: '16px',
      },
      boxShadow: {
        card: '0 30px 60px rgba(0, 0, 0, 0.25)',
      },
    },
  },
  plugins: [],
}
