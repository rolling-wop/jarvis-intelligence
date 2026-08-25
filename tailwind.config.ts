import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0A0E1A',
        surface: '#111827',
        elevated: '#1F2937',
        border: '#374151',
        primary: '#00D4FF',
        positive: '#00FF87',
        negative: '#FF4757',
        warning: '#FFB800',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: []
}
export default config
