/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        black: '#000000',
        white: '#ffffff',
        // Dúo de acentos "dark luxury":
        // silver = Pantone 20-0002 Ice Palace — acento metálico (texto/bordes).
        // depths = Pantone 19-3940 Blue Depths — capa atmosférica (fondos/glow),
        // siempre en opacidades bajas para dar color sin opacar.
        silver: '#C9D0D6',
        depths: '#263056',
      },
      fontFamily: {
        // grotesk = voz de marca y UI (logo, menús, botones, captions).
        // display = acento editorial serif (nombres de colección).
        // mono = solo datos técnicos (UUIDs, guías de rastreo).
        grotesk: ['"Alte Haas Grotesk"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['"Cormorant Garamond"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      // KALEMCI es 100% de bordes rectos: no existen radios en este sistema.
      borderRadius: {
        none: '0px',
        sm: '0px',
        DEFAULT: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        full: '0px',
      },
    },
  },
  corePlugins: {
    // Deshabilitado a nivel de core: ninguna clase puede generar esquinas curvas.
    borderRadius: false,
  },
  plugins: [],
}
