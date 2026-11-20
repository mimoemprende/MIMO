/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta oficial MIMO
        mimo: {
          blue: '#0040B7',
          'blue-dark': '#002F87',
          'blue-50': '#EEF3FC',
          'blue-100': '#D6E2F7',
          cyan: '#02D9FE',
          'cyan-50': '#E6FBFF',
          yellow: '#FDC703',
          orange: '#FD9301',
          ink: '#0B1B3A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,27,58,.06), 0 4px 16px rgba(11,27,58,.06)',
      },
    },
  },
  plugins: [],
};
