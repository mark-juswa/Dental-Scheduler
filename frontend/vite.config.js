import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  build: {
    // Raise the warning threshold so CI doesn't treat it as error
    chunkSizeWarningLimit: 1800,

    rollupOptions: {
      output: {
        // Split large vendor libs into separate cached chunks
        manualChunks: {
          'react-vendor':   ['react', 'react-dom'],
          'supabase':       ['@supabase/supabase-js'],
          'ph-address':     ['phil-reg-prov-mun-brgy'],
          'axios':          ['axios'],
        },
      },
    },
  },
})
