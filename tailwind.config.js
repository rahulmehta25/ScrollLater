/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#F9F8F6',
          soft: '#F9F8F6',
          raised: '#F9F8F6',
          muted: '#F0EBE6',
          deep: '#E6DFD7',
          band: '#F0EBE6',
        },
        ink: {
          DEFAULT: '#2A2622',
          muted: '#5C564E',
          subtle: '#8A8378',
          faint: '#B0A99C',
        },
        terracotta: {
          50: '#FBF3EE',
          100: '#F3E0D4',
          200: '#E8C4B0',
          300: '#D9A288',
          400: '#C48466',
          500: '#B86A4B',
          600: '#9A563C',
          700: '#7A4430',
          800: '#5C3324',
          900: '#3D2218',
        },
        olive: {
          50: '#F4F5F0',
          100: '#E4E7D9',
          200: '#CDD3B8',
          300: '#AFB68F',
          400: '#8F976C',
          500: '#6B7355',
          600: '#555C44',
          700: '#424735',
          800: '#303328',
          900: '#1F211A',
        },
        primary: {
          50: '#FBF3EE',
          100: '#F3E0D4',
          200: '#E8C4B0',
          300: '#D9A288',
          400: '#C48466',
          500: '#B86A4B',
          600: '#9A563C',
          700: '#7A4430',
          800: '#5C3324',
          900: '#3D2218',
        },
        gray: {
          50: '#F9F8F6',
          100: '#F0EBE6',
          200: '#E6DFD7',
          300: '#D4CDC0',
          400: '#B0A99C',
          500: '#8A8378',
          600: '#5C564E',
          700: '#3F3A34',
          800: '#2A2622',
          900: '#1C1916',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        display: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
        112: '28rem',
        128: '32rem',
      },
      letterSpacing: {
        display: '-0.02em',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(42, 38, 34, 0.03), 0 4px 14px rgba(42, 38, 34, 0.04)',
        lift: '0 8px 24px rgba(42, 38, 34, 0.06)',
      },
      transitionDuration: {
        craft: '180ms',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
        rise: 'rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      transitionTimingFunction: {
        calm: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
