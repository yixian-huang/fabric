/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        fabric: {
          bg: '#f7f4ef',
          surface: '#fffcf8',
          ink: '#1c1917',
          muted: '#78716c',
          accent: '#9a7b4f',
          'accent-soft': '#f0e8dc',
          border: 'rgba(28, 25, 23, 0.08)',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        fabric: '0 4px 24px rgba(28, 25, 23, 0.06)',
        'fabric-hover': '0 20px 48px rgba(28, 25, 23, 0.12)',
      },
    },
  },
  plugins: [],
};
