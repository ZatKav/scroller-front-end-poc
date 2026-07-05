/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		// Mobile landscape: landscape orientation with a short viewport. The
  		// max-height guard excludes tall desktop landscape so the desktop layout
  		// is unchanged. Kept in sync with MOBILE_LANDSCAPE_QUERY in
  		// ImageScroller.tsx (PRO-235).
  		screens: {
  			'mobile-landscape': {
  				raw: '(orientation: landscape) and (max-height: 600px)'
  			}
  		},
  		fontFamily: {
  			sans: [
  				'Inter',
  				'system-ui',
  				'sans-serif'
  			]
  		},
  		// Zelli design tokens (from Zelli MVP Figma). Shared brand palette meant
  		// to be adopted across the app via utilities like `bg-zelli-bg`,
  		// `text-zelli-ink`, `bg-zelli-primary`, `border-zelli-border`. Starting
  		// point is the 03 Sign In screen; extend as more screens are ported.
  		colors: {
  			zelli: {
  				bg: '#f7f4ef', // cream page background
  				surface: '#ffffff', // input / card surface
  				ink: '#1f2421', // primary text
  				muted: '#6f746f', // secondary / fine-print text
  				placeholder: '#8a8a8a', // input placeholder
  				border: '#d8d2c8', // input / divider border
  				primary: '#b83f63', // magenta CTA + accent
  				'primary-hover': '#a3395a', // primary hover/active
  				'primary-soft': '#fdecef', // tinted primary surface (e.g. error banners)
  				accent: '#3f6f4e', // green: step indicator, selected chips, secondary buttons
  				'accent-soft': '#e7eee7' // selected chip fill
  			}
  		},
  		boxShadow: {
  			card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  			'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			'zelli-input': '14px',
  			'zelli-btn': '16px',
  			'zelli-card': '20px'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
