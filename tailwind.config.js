/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1655c3',
        'light-green': '#95d348',
        'dark-green': '#64ac37',
        brand: {
          blue: '#1655c3',
          lightgreen: '#95d348',
          darkgreen: '#64ac37',
        },
        // Admin panel design system (Round 14 Part C) — named so admin
        // components can use `bg-admin-navy` etc. instead of repeating the
        // literal hex everywhere.
        'admin-navy': '#0A1B3D',
        'admin-bg': '#F7F9FC',
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'medical-gradient': 'linear-gradient(135deg, #e7f3ff 0%, #f4fff5 100%)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
