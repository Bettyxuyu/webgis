import { defineConfig } from 'vite'
import { readFileSync, cpSync } from 'node:fs'
import { resolve } from 'node:path'

let outputDirectory='dist'
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [{ name: 'local-photo-review',
    configResolved(config) { outputDirectory=config.build.outDir },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = req.url?.split('?')[0].match(/^\/media\/review\/(index\.json|tour-index\.json|culture-index\.json|culture-[a-zA-Z0-9_-]+\.webp|tour-[a-z]+-\d+\.webp|W\d+_\d+\.webp)$/)?.[1]
        if (!name) return next()
        try {
          res.setHeader('Content-Type', name.endsWith('.json') ? 'application/json' : 'image/webp')
          res.end(readFileSync(resolve('media_review', name)))
        } catch { res.statusCode = 404; res.end('Local review image unavailable') }
      })
    },
    closeBundle() {
      if (mode === 'review') cpSync('media_review', resolve(outputDirectory,'media/review'), { recursive: true })
    },
  }],
  server: { fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**',
    '**/*.{shp,shx,dbf,prj,sbn,sbx,cpg,xml,kmz,rar,xlsx}', '**/.geo-tools/**', '**/.terrain-tools/**',
    '**/.npm-cache/**', '**/source_data/**', '**/historical_data/**', '**/materials/**', '**/backups/**'] } },
}))
