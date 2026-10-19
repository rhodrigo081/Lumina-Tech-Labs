/** Tokens do design system EcoMetric (copiados dos protótipos HTML) */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Cores vêm de variáveis CSS (src/styles.css): troque o tema alterando só as variáveis.
      colors: Object.fromEntries(
        ["on-background", "on-secondary-container", "error-container", "background", "on-surface", "primary-container", "on-tertiary-fixed-variant", "inverse-on-surface", "secondary-fixed-dim", "on-primary", "surface-tint", "surface-container-highest", "on-surface-variant", "tertiary-fixed", "secondary-fixed", "primary-fixed", "primary-fixed-dim", "on-primary-fixed", "primary", "on-primary-fixed-variant", "inverse-surface", "on-secondary-fixed-variant", "on-secondary", "surface-dim", "on-tertiary-container", "outline", "on-tertiary-fixed", "on-primary-container", "secondary", "surface-container", "on-tertiary", "tertiary-fixed-dim", "surface-container-low", "surface-container-lowest", "surface", "inverse-primary", "outline-variant", "error", "on-error-container", "surface-bright", "on-error", "on-secondary-fixed", "secondary-container", "tertiary-container", "tertiary", "surface-container-high", "surface-variant", "fg-primary", "fg-secondary", "fg-tertiary", "fg-error", "lit-tertiary", "lit-tertiary-dim", "lit-on-tertiary", "lit-secondary"].map((n) => [n, `rgb(var(--c-${n}) / <alpha-value>)`]),
      ),
      borderRadius: { DEFAULT: '0.25rem', lg: '0.5rem', xl: '0.75rem', full: '9999px' },
      spacing: {
        'space-sm': '0.5rem', 'space-md': '1rem', 'space-xl': '2.5rem', gutter: '1.5rem', margin: '2rem',
        'margin-mobile': '1rem', 'space-xs': '0.25rem', 'gutter-mobile': '1rem', 'space-lg': '1.5rem',
      },
      fontFamily: Object.fromEntries(
        ['metric-numeral','label-md','metric-numeral-sm','display','headline-lg-mobile','label-mono','headline-md',
         'headline-sm','body-md','headline-lg','display-mobile','body-sm','label-lg','body-lg']
          .map((k) => [k, ['Plus Jakarta Sans', 'sans-serif']])),
      fontSize: {
        'metric-numeral': ['36px', { lineHeight: '44px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '600' }],
        'metric-numeral-sm': ['24px', { lineHeight: '30px', letterSpacing: '-0.01em', fontWeight: '700' }],
        display: ['48px', { lineHeight: '56px', letterSpacing: '-0.03em', fontWeight: '800' }],
        'headline-lg-mobile': ['26px', { lineHeight: '34px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'label-mono': ['11px', { lineHeight: '14px', letterSpacing: '0.05em', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '32px', letterSpacing: '-0.015em', fontWeight: '700' }],
        'headline-sm': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'body-md': ['15px', { lineHeight: '24px', fontWeight: '400' }],
        'headline-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-mobile': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'body-sm': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'label-lg': ['14px', { lineHeight: '20px', letterSpacing: '0.01em', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
      },
    },
  },
  plugins: [],
};