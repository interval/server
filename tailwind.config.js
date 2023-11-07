/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */
const tailwindTypography = require('@tailwindcss/typography')
const plugin = require('tailwindcss/plugin')
const textFillStrokePlugin = require('tailwindcss-text-fill')

// On iOS, the screen flows under the main viewport. It was reported as a bug but was closed as WontFix.//
// This is basically "min-h-screen" but for iOS Safari. @supports excludes it from Chrome on iOS.
const iosFullHeightPlugin = plugin(function ({ addUtilities }) {
  const supportsTouchRule = '@supports (-webkit-touch-callout: none)'

  const utilities = {
    '.min-h-screen-ios': {
      minHeight: '100vh',
      [supportsTouchRule]: {
        minHeight: '-webkit-fill-available',
      },
    },
    '.h-screen-ios': {
      height: '100vh',
      [supportsTouchRule]: {
        height: '-webkit-fill-available',
      },
    },
  }

  addUtilities(utilities)
})

const proseLink = theme => ({
  fontWeight: 400,
  color: theme('colors.slate[600]'),
  textDecoration: 'underline',
  textDecorationColor: theme('colors.slate[300]'),
  textUnderlineOffset: '3px',
  '&:hover': {
    color: theme('colors.gray[900]'),
    textDecorationColor: theme('colors.slate[600]'),
  },
})

module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
      mono: [
        'ui-monospace',
        'SFMono-Regular',
        'Menlo',
        'Monaco',
        'Consolas',
        'Liberation Mono',
        'Courier New',
        'monospace',
      ],
    },
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      'hero-max': '1100px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      boxShadow: {
        dropdown: '0 6px 14px rgba(24, 39, 75, 0.09)',
        'command-bar':
          '0px 22px 44px -14px rgba(3, 8, 19, 0.15), 0px 4px 15px -4px rgba(3, 8, 19, 0.18)',
        // this button floats on top of table cells and needs to color-match the cell background
        'truncate-button': '0 0 12px 4px var(--color-cell-bg)',
      },
      colors: {
        primary: {
          50: '#E4EBFB',
          100: '#CEDBF8',
          200: '#9DB6F1',
          300: '#6C92E9',
          400: '#376AE2',
          500: '#1D4FC5',
          600: '#173F9C',
          700: '#123078',
          800: '#0C2050',
          900: '#061028',
        },
      },
      animation: {
        'loading-outer': 'loading 2s linear infinite',
        'loading-inner':
          'loadingInner 1.6s cubic-bezier(0.4, 0.15, 0.6, 0.85) infinite',
        pulse: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      transitionTimingFunction: {
        'in-menu': 'cubic-bezier(.18, 1.25, .4, 1)',
      },
      letterSpacing: {
        wide: '0.01em',
        wider: '0.025em',
        widest: '0.05em',
      },
      keyframes: {
        loading: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        loadingInner: {
          '0%': { strokeDashoffset: 600 },
          '100%': { strokeDashoffset: 0 },
        },
        pulse: {
          '0%': { opacity: 1 },
          '50%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
      // keep in sync with utils/number.ts
      height: {
        'img-thumbnail': '64px',
        'img-small': '128px',
        'img-medium': '256px',
        'img-large': '512px',
        'dropdown-img-thumbnail': '32px',
        'dropdown-img-small': '48px',
        'dropdown-img-medium': '80px',
        'dropdown-img-large': '128px',
      },
      width: {
        'img-thumbnail': '64px',
        'img-small': '128px',
        'img-medium': '256px',
        'img-large': '512px',
        'dropdown-img-thumbnail': '32px',
        'dropdown-img-small': '48px',
        'dropdown-img-medium': '80px',
        'dropdown-img-large': '128px',
      },
      maxHeight: {
        'img-thumbnail': '64px',
        'img-small': '128px',
        'img-medium': '256px',
        'img-large': '512px',
      },
      maxWidth: {
        'img-thumbnail': '64px',
        'img-small': '128px',
        'img-medium': '256px',
        'img-large': '512px',
      },
      minHeight: {
        'img-thumbnail': '64px',
        'img-small': '128px',
        'img-medium': '256px',
        'img-large': '512px',
      },
      minWidth: {
        'img-thumbnail': '64px',
        'img-small': '128px',
        'img-medium': '256px',
        'img-large': '512px',
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-pre-code': '#383a42',
            '--tw-prose-pre-bg': theme('colors.gray[50]'),
            '> pre': {
              borderWidth: 1,
              borderColor: theme('colors.gray[200]'),
              borderRadius: theme('borderRadius.md'),
              padding: 0,
            },
            code: {
              fontSize: '0.9em',
              lineHeight: '1.5',
              fontWeight: 400,
              '&::before': {
                display: 'none',
              },
              '&::after': {
                display: 'none',
              },
            },
            u: {
              'text-underline-offset': '4px',
            },
            a: {
              color: theme('colors.primary[500]'),
            },
            // matches the font size of page titles in <PageHeading />
            h1: {
              fontSize: '1.875rem',
              letterSpacing: '-0.025em',
              lineHeight: '2.25rem',
            },
            h2: {
              fontSize: '1.5rem',
              lineHeight: '2rem',
              letterSpacing: '-0.025em',
            },
            h3: {
              letterSpacing: '-0.01em',
            },
            blockquote: {
              fontWeight: 400,
              fontStyle: 'normal',
              color: 'inherit',
              p: {
                '&::before': {
                  display: 'none',
                  content: '',
                },
                '&::after': {
                  display: 'none',
                  content: '',
                },
              },
            },
            ul: {
              margin: '1em 0 1em 1em',
              'li p': { margin: 0 },
            },
            ol: {
              margin: '1em 0 1em 1em',
              'li p': { margin: 0 },
            },
          },
        },
        'io-table': {
          css: [
            {
              '--tw-prose-body': 'inherit',
              '--tw-prose-headings': 'inherit',
              '--tw-prose-lead': 'inherit',
              '--tw-prose-links': 'inherit',
              '--tw-prose-bold': 'inherit',
              '--tw-prose-bullets': 'inherit',
              '--tw-prose-counters': 'inherit',
              '--tw-prose-captions': 'inherit',
              '--tw-prose-quotes': 'inherit',
              '--tw-prose-pre-bg': 'unset',
              maxWidth: '100%',
              fontSize: '0.875rem',
              a: proseLink(theme),
              code: {
                backgroundColor: theme('colors.gray[50]'),
                borderWidth: 1,
                borderRadius: theme('borderRadius.md'),
                borderColor: theme('colors.gray[100]'),
                padding: '0.1em 0.2em',
              },
              pre: {
                padding: 0,
                border: 0,
                width: '100%',
              },
              p: {
                marginTop: '0.8em',
                marginBottom: '0.8em',
              },
              ul: {
                margin: '0.8em 0 0.8em 0.5em',
              },
              ol: {
                margin: '0.8em 0 0.8em 0.5em',
              },
              h1: {
                fontSize: theme('fontSize.2xl'),
              },
              h4: {
                margin: '1.5em 0 0.5em 0',
              },
              h5: {
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                fontSize: '1em',
                fontWeight: 600,
                margin: '1.5em 0 0.5em 0',
                color: theme('colors.gray[600]'),
              },
              hr: {
                margin: '1.5em 0',
                height: '1px',
                border: 0,
                background: theme('colors.gray[200]'),
              },
              'h1, h2, h3, h4, h5, h6': {
                marginBottom: '0.5em',
              },
              'h1, h2, h3, h4, h5, h6, p, ul, ol, pre': {
                '&:first-child': {
                  marginTop: 0,
                },
                '&:last-child': {
                  marginBottom: 0,
                },
              },
            },
          ],
        },
        sm: {
          css: {
            'ul, ol': {
              whiteSpace: 'normal',
            },
            'ul ul': {
              margin: 0,
            },
            'ol ol': {
              margin: 0,
            },
            pre: {
              padding: 0,
              margin: 0,
            },
          },
        },
        // for simple inline markdown within components, e.g. input helpText or io.confirm description
        inline: {
          css: {
            'p, ul, ol': {
              marginTop: '0.8em',
              marginBottom: '0.8em',
              '&:first-child': {
                marginTop: 0,
              },
              '&:last-child': {
                marginBottom: 0,
              },
              position: 'relative',
            },
            'ul, ol': {
              marginLeft: '1.5em',
            },
            'ol li': {
              listStyle: 'decimal outside',
            },
            'ul li': {
              position: 'relative',
            },
            'ul li::before': {
              display: 'block',
              content: '"–"',
              position: 'absolute',
              left: '-1em',
              top: 0,
              color: theme('colors.gray[500]'),
            },
            a: {
              color: theme('colors.primary[500]'),
              fontWeight: 500,

              '&:hover': {
                opacity: 0.7,
              },
            },
          },
        },
      }),
      screens: {
        'supports-hover': { raw: '(hover: hover) and (pointer: fine)' },
        pwa: { raw: '(display-mode: standalone)' },
      },
    },
  },
  plugins: [
    iosFullHeightPlugin,
    textFillStrokePlugin,
    tailwindTypography,
    plugin(function ({ addComponents, theme }) {
      addComponents({
        '.prose-link': proseLink(theme),
      })
    }),
  ],
}
