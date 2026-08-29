import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  // NB : pas de `output: 'standalone'`. L'image de prod conserve les
  // node_modules complets car le CLI `payload migrate` doit tourner au
  // démarrage du conteneur (le standalone minimal ne l'embarque pas).
  // Désactive la génération automatique de AGENTS.md / CLAUDE.md par Next 16
  // (le projet gère ses propres conventions via BMAD).
  agentRules: false,
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
