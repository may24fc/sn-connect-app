import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', '../../packages/ui/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary — SN teal
        primary: {
          50: '#F1F7F9',
          100: '#E2EFF3',
          200: '#C2DDE5',
          300: '#99C0CE',
          400: '#7AAAAE',
          500: '#6099AC',
          600: '#457E92',
          700: '#2D6577',
          800: '#175063',
          900: '#103E4D',
          950: '#0A2B36',
          DEFAULT: '#175063',
        },

        // Accent — Metallic
        accent: {
          50: '#F7F7F5',
          100: '#EFEFEC',
          200: '#DFE0DB',
          300: '#CFD0C9',
          400: '#B8BAB3',
          500: '#9A9D95',
          600: '#7C8078',
          700: '#62655E',
          800: '#4A4C47',
          900: '#323431',
          950: '#1D1E1C',
          DEFAULT: '#B8BAB3',
        },

        // Semantic
        success: { DEFAULT: '#16A34A', foreground: '#FFFFFF' },
        warning: { DEFAULT: '#F59E0B', foreground: '#FFFFFF' },
        error: { DEFAULT: '#E11D48', foreground: '#FFFFFF' },

        // Layout
        background: '#FAFCFC',
        foreground: '#0B0E10',
        card: { DEFAULT: '#FFFFFF', foreground: '#0B0E10' },
        muted: { DEFAULT: '#EEF5F7', foreground: '#5F7180' },
        border: '#D7E3E8',
        input: '#D7E3E8',
        ring: '#175063',
      },

      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['var(--font-heading)', 'system-ui', '-apple-system', 'sans-serif'],
      },

      fontSize: {
        xs: ['var(--font-size-xs)', { lineHeight: 'var(--line-height-xs)' }],
        sm: ['var(--font-size-sm)', { lineHeight: 'var(--line-height-sm)' }],
        base: ['var(--font-size-base)', { lineHeight: 'var(--line-height-base)' }],
        lg: ['var(--font-size-lg)', { lineHeight: 'var(--line-height-lg)' }],
        xl: ['var(--font-size-xl)', { lineHeight: 'var(--line-height-xl)' }],
        '2xl': ['var(--font-size-2xl)', { lineHeight: 'var(--line-height-2xl)' }],
        '3xl': ['var(--font-size-3xl)', { lineHeight: 'var(--line-height-3xl)' }],
        '4xl': ['var(--font-size-4xl)', { lineHeight: 'var(--line-height-4xl)' }],
        '5xl': ['var(--font-size-5xl)', { lineHeight: 'var(--line-height-5xl)' }],
        '6xl': ['var(--font-size-6xl)', { lineHeight: 'var(--line-height-6xl)' }],
      },

      letterSpacing: {
        tightest: '-0.03em',
        tighter: '-0.02em',
        tight: '-0.01em',
      },

      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      },

      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        mega: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.08)',
      },

      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-up': 'fade-up 0.5s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        marquee: 'marquee 35s linear infinite',
        'marquee-reverse': 'marquee-reverse 28s linear infinite',
      },

      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
