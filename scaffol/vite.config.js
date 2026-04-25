import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createReadStream, statSync, existsSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-data-dir',
      configureServer(server) {
        const dataDir = resolve(__dirname, 'data')
        server.middlewares.use('/data', (req, res, next) => {
          const filePath = join(dataDir, decodeURIComponent(req.url.replace(/^\//, '')))
          if (existsSync(filePath)) {
            try {
              const stat = statSync(filePath)
              if (stat.isFile()) {
                res.setHeader('Content-Type', 'text/csv; charset=utf-8')
                res.setHeader('Content-Length', stat.size)
                res.setHeader('Access-Control-Allow-Origin', '*')
                createReadStream(filePath).pipe(res)
                return
              }
            } catch (_) {}
          }
          next()
        })
      }
    }
  ],
})
