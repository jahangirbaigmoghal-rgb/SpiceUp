export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172033',
        mist: '#f6f8fb',
        line: '#dbe3ef',
        pos: {
          navy: '#16213e',
          navy2: '#1f3158',
          aqua: '#0f8b8d',
          teal: '#15a6a0',
          lime: '#9fd356',
          gold: '#f7b801',
          rose: '#ef476f',
          paper: '#f8faf9',
          line: '#dfe8e7',
          ink: '#15202b'
        }
      },
      boxShadow: {
        soft: '0 10px 30px rgba(22, 33, 62, 0.12)',
        product: '0 7px 18px rgba(22, 33, 62, 0.07)'
      }
    }
  },
  plugins: []
};
