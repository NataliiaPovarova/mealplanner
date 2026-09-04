import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const VIRTUAL_ID = 'virtual:nutrition-baseline'
const RESOLVED_ID = '\0' + VIRTUAL_ID
const SOURCE_FILE = 'src/data/nutrition/ingredients-usda.json'

/**
 * ingredients-usda.json also stores the raw FoodData Central payload (~125k lines),
 * but the app only needs the per100g block. Stripping it here keeps the raw
 * payload out of the bundle while staying in sync with the cache automatically.
 */
function nutritionBaseline() {
  let root = process.cwd()

  return {
    name: 'nutrition-baseline',
    configResolved(config) {
      root = config.root
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null
    },
    load(id) {
      if (id !== RESOLVED_ID) return null
      const file = path.join(root, SOURCE_FILE)
      this.addWatchFile(file)
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
      const perIngredient = {}
      for (const [ingredientId, entry] of Object.entries(raw)) {
        if (entry?.per100g) perIngredient[ingredientId] = entry.per100g
      }
      return `export default ${JSON.stringify(perIngredient)}`
    },
  }
}

export default defineConfig({
  plugins: [react(), nutritionBaseline()],
  // The dep cache defaults to node_modules/.vite. This project lives in a synced
  // Dropbox folder, where the sync client holds that directory open and the
  // optimizer's rename step fails with EBUSY. Keeping the cache outside the
  // synced tree sidesteps it.
  cacheDir: path.join(os.tmpdir(), 'vite-mealplanner'),
  build: {
    rollupOptions: {
      output: {
        // The SDK changes far less often than the app, so a separate chunk stays
        // in the browser cache across deploys instead of being refetched.
        manualChunks(id) {
          if (id.includes('node_modules/@firebase') || id.includes('node_modules/firebase')) {
            return 'firebase'
          }
          return null
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: false,
  },
})
