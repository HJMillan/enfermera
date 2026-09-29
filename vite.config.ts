import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

// Única fuente de la versión: package.json. Llega a la app (APP_VERSION) y al service worker.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}

/** Genera dist/sw.js desde sw/sw.js con la versión y la lista de archivos del build. */
function serviceWorker(): Plugin {
  return {
    name: 'planilla-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = Object.keys(bundle)
        .filter((file) => file.startsWith('assets/'))
        .map((file) => `/${file}`)
      const template = readFileSync(new URL('./sw/sw.js', import.meta.url), 'utf8')
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template.split('__APP_VERSION__').join(version).split('__PRECACHE__').join(JSON.stringify(files)),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), serviceWorker()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
})
