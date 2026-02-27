import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', '../../packages/ui/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Sidebar - Light theme (White/Zinc)
        sidebar: {
          DEFAULT: '#FFFFFF',
          foreground: '#18181B', // Zinc 900
          hover: '#F4F4F5', // Zinc 100
          accent: '#EEF2FF', // Indigo 50
          'accent-foreground': '#4F46E5', // Indigo 600
          muted: '#71717A', // Zinc 500
          border: '#E4E4E7', // Zinc 200
        },

        // Primary - Indigo (NOT Blue)
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
          DEFAULT: '#4F46E5',
          foreground: '#FFFFFF',
        },

        // Semantic Colors
        success: {
          50: '#ECFDF5',
          500: '#10B981',
          600: '#059669',
          DEFAULT: '#16A34A',
          foreground: '#FFFFFF',
        },
        warning: {
          50: '#FFFBEB',
          500: '#F59E0B',
          600: '#D97706',
          DEFAULT: '#F59E0B',
          foreground: '#FFFFFF',
        },
        error: {
          50: '#FEF2F2',
          500: '#EF4444',
          600: '#DC2626',
          DEFAULT: '#E11D48',
          foreground: '#FFFFFF',
        },

        // Neutral - Zinc Scale
        background: '#FAFAFA',
        foreground: '#09090B',
        muted: {
          DEFAULT: '#F4F4F5',
          foreground: '#71717A',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#18181B',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#18181B',
        },
        accent: {
          DEFAULT: '#EEF2FF', // Indigo 50
          foreground: '#4F46E5', // Indigo 600
        },
        border: '#E4E4E7',
        input: '#E4E4E7',
        ring: '#4F46E5',
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },

      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }], // 13px
        base: ['0.875rem', { lineHeight: '1.5rem' }], // 14px (Dense)
        lg: ['1rem', { lineHeight: '1.5rem' }], // 16px
        xl: ['1.125rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '3xl': ['1.5rem', { lineHeight: '2rem' }],
        '4xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },

      letterSpacing: {
        tightest: '-0.02em',
        tighter: '-0.01em',
      },

      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        sidebar: '16rem',
        'sidebar-collapsed': '4rem',
        header: '4rem',
      },

      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },

      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        'card-hover': '0 2px 4px 0 rgb(0 0 0 / 0.05)',
        dropdown: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        sheet: '-4px 0 15px -3px rgb(0 0 0 / 0.1)',
      },

      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
        'slide-up': 'slide-up 0.2s ease-out',
        skeleton: 'skeleton 1.5s ease-in-out infinite',
        shimmer: 'shimmer 2s infinite',
      },

      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-8px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        skeleton: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },

      height: {
        'screen-safe': '100dvh',
      },
    },
  },
  plugins: [],
};

export default config;
