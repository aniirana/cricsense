/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#060a08',
        surface: '#0c120e',
        card:    '#111a14',
        card2:   '#162019',
        border:  '#1d2e20',
        border2: '#253528',
        green:   '#22c55e',
        green2:  '#16a34a',
        lime:    '#a3e635',
        orange:  '#f97316',
        red:     '#ef4444',
        text:    '#e2ede4',
        muted:   '#6b8f72',
        faint:   '#2a3d2d',
      },
      fontFamily: {
        syne:  ['Syne', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
