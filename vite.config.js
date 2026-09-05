import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// The dash API's origin, taken from the same env var the client uses so the two
// cannot drift. Only the origin matters here — the /v1/dash path stays on the
// request and is forwarded through.
function dashOrigin(raw) {
  try { return raw ? new URL(raw).origin : '' } catch { return '' }
}

// https://vite.dev/config/
//
// VITE_BASE_URL and VITE_RISK_API_BASE are called absolutely in every mode:
// both backends allow this origin via CORS, so Vite has no reason to rewrite
// hosts for them.
//
// The dash API Worker is the exception — it does not send
// Access-Control-Allow-Origin for localhost, so a direct browser call fails the
// preflight. In dev only, /dash-api is proxied to it: the browser then makes a
// same-origin request and CORS never enters the picture. api.js switches to
// that prefix under import.meta.env.DEV.
//
// This is a dev-server feature and does not exist in a build, so production
// still needs the Worker to allow the deployed origin.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = dashOrigin(env.VITE_RISK_CUSTOM_DASH_BASE)

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
    ],
    server: {
      port: 3000,
      // Omitted entirely when the var is unset, so a missing .env fails as a
      // clear "not configured" error rather than a proxy to nowhere.
      proxy: target
        ? {
            '/dash-api': {
              target,
              changeOrigin: true,
              rewrite: (p) => p.replace(/^\/dash-api/, ''),
            },
          }
        : undefined,
    },
  }
})
