/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        earth: {
          bg: '#0d0d14',
          text: '#f1f5f9',
          muted: '#64748b',
          border: 'rgba(255,255,255,0.08)',
        },
        // Primary action color — violet
        leaf: {
          DEFAULT: '#8b5cf6',
          dark: '#7c3aed',
          light: 'rgba(139,92,246,0.10)',
        },
        // Pending / current round — amber
        wheat: {
          DEFAULT: '#f59e0b',
          light: 'rgba(245,158,11,0.10)',
        },
        // Error / danger — red
        rust: {
          DEFAULT: '#f87171',
          light: 'rgba(248,113,113,0.10)',
        },
      },
      fontFamily: {
        serif: ['var(--font-dm-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      borderRadius: {
        card: '12px',
      },
      maxWidth: {
        content: '1100px',
      },
    },
  },
  plugins: [],
};
