import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				// Legacy compatibility colors
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Material Design 3 surface colors
				'md-surface': 'hsl(var(--md-sys-color-surface))',
				'md-surface-dim': 'hsl(var(--md-sys-color-surface-dim))',
				'md-surface-bright': 'hsl(var(--md-sys-color-surface-bright))',
				'md-surface-container-lowest': 'hsl(var(--md-sys-color-surface-container-lowest))',
				'md-surface-container-low': 'hsl(var(--md-sys-color-surface-container-low))',
				'md-surface-container': 'hsl(var(--md-sys-color-surface-container))',
				'md-surface-container-high': 'hsl(var(--md-sys-color-surface-container-high))',
				'md-surface-container-highest': 'hsl(var(--md-sys-color-surface-container-highest))',
				'md-on-surface': 'hsl(var(--md-sys-color-on-surface))',
				'md-on-surface-variant': 'hsl(var(--md-sys-color-on-surface-variant))',
				// Material Design 3 primary colors
				'md-primary': 'hsl(var(--md-sys-color-primary))',
				'md-on-primary': 'hsl(var(--md-sys-color-on-primary))',
				'md-primary-container': 'hsl(var(--md-sys-color-primary-container))',
				'md-on-primary-container': 'hsl(var(--md-sys-color-on-primary-container))',
				// Material Design 3 secondary colors
				'md-secondary': 'hsl(var(--md-sys-color-secondary))',
				'md-on-secondary': 'hsl(var(--md-sys-color-on-secondary))',
				'md-secondary-container': 'hsl(var(--md-sys-color-secondary-container))',
				'md-on-secondary-container': 'hsl(var(--md-sys-color-on-secondary-container))',
				// Material Design 3 tertiary colors
				'md-tertiary': 'hsl(var(--md-sys-color-tertiary))',
				'md-on-tertiary': 'hsl(var(--md-sys-color-on-tertiary))',
				'md-tertiary-container': 'hsl(var(--md-sys-color-tertiary-container))',
				'md-on-tertiary-container': 'hsl(var(--md-sys-color-on-tertiary-container))',
				// Material Design 3 error colors
				'md-error': 'hsl(var(--md-sys-color-error))',
				'md-on-error': 'hsl(var(--md-sys-color-on-error))',
				'md-error-container': 'hsl(var(--md-sys-color-error-container))',
				'md-on-error-container': 'hsl(var(--md-sys-color-on-error-container))',
				// Material Design 3 outline
				'md-outline': 'hsl(var(--md-sys-color-outline))',
				'md-outline-variant': 'hsl(var(--md-sys-color-outline-variant))'
			},
			backgroundImage: {
				'gradient-court': 'var(--gradient-court)',
				'gradient-ball': 'var(--gradient-ball)',
				'gradient-hero': 'var(--gradient-hero)'
			},
			boxShadow: {
				// MD3 Elevation levels
				'md-elevation-0': 'var(--md-sys-elevation-0)',
				'md-elevation-1': 'var(--md-sys-elevation-1)',
				'md-elevation-2': 'var(--md-sys-elevation-2)',
				'md-elevation-3': 'var(--md-sys-elevation-3)',
				'md-elevation-4': 'var(--md-sys-elevation-4)',
				'md-elevation-5': 'var(--md-sys-elevation-5)'
			},
			borderRadius: {
				// MD3 Shape tokens
				'none': 'var(--md-sys-shape-corner-none)',
				'xs': 'var(--md-sys-shape-corner-extra-small)',
				'sm': 'var(--md-sys-shape-corner-small)',
				'md': 'var(--md-sys-shape-corner-medium)',
				'lg': 'var(--md-sys-shape-corner-large)',
				'xl': 'var(--md-sys-shape-corner-extra-large)',
				'full': 'var(--md-sys-shape-corner-full)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
