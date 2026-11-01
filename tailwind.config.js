/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#2563EB',
          hover: '#1D4ED8',
          secondary: '#38BDF8',
          teal: '#0D9488',
          emerald: '#059669',
        },
        canvas: {
          DEFAULT: '#FFFFFF',
          pearl: '#F8FAFC',
          ambient: '#F3F8FF',
          surface: '#EFF6FF',
        },
        stroke: {
          subtle: '#E2E8F0',
          ice: '#DCEBFF',
          active: '#BFDBFE',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(37, 99, 235, 0.03)',
        card: '0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(37, 99, 235, 0.04)',
        'card-hover': '0 14px 28px -4px rgba(37, 99, 235, 0.09), 0 6px 12px -2px rgba(15, 23, 42, 0.03)',
        floating: '0 20px 32px -6px rgba(37, 99, 235, 0.12), 0 8px 16px -4px rgba(15, 23, 42, 0.05)',
      },
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        'md': '10px',
        'lg': '16px',
        'xl': '24px',
      },
    },
  },
  plugins: [],
};

