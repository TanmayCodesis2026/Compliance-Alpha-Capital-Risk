import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
// No dev proxy: api.js sends absolute requests to VITE_BASE_URL in every mode,
// so the backend handles this origin via CORS rather than Vite rewriting hosts.
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  server: {
    port: 3000,
  },
})
