import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createReadStream, statSync, existsSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'serve-data-dir',
        configureServer(server) {
          const dataDir = resolve(__dirname, 'data')

          // Serve CSV data files
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

          // Proxy Anthropic API calls server-side to avoid CORS and keep key off the client
          server.middlewares.use('/api/chat', (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.end()
              return
            }

            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', async () => {
              try {
                const upstream = await fetch('https://api.anthropic.com/v1/messages', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': env.ANTHROPIC_API_KEY || '',
                    'anthropic-version': '2023-06-01',
                  },
                  body,
                })
                const data = await upstream.json()
                res.setHeader('Content-Type', 'application/json')
                res.statusCode = upstream.status
                res.end(JSON.stringify(data))
              } catch (e) {
                res.statusCode = 502
                res.end(JSON.stringify({ error: e.message }))
              }
            })
          })
        },
      },
    ],
  }
})
