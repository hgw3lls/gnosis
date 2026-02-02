/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"] ,
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#111111',
          crimson: '#e34a2b',
          cobalt: '#2e5cff',
          moss: '#1f7a5a',
          gold: '#f2c94c',
          plum: '#5b3a82',
        },
        paper: {
          DEFAULT: '#f7f2e8',
          soft: '#f1ebdf',
          muted: '#e6ddcf',
        },
      },
      boxShadow: {
        'print-sm': '2px 2px 0 0 #111111',
        'print-md': '4px 4px 0 0 #111111',
        'print-lg': '6px 6px 0 0 #111111',
      },
      borderWidth: {
        rule: '2px',
        rule2: '4px',
      },
      fontFamily: {
        grotesk: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
        monoish: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
      letterSpacing: {
        tightish: '-0.015em',
        ink: '0.25em',
      },
    },
  },
  plugins: [],
};
