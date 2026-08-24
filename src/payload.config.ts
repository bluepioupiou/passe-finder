import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { fr } from '@payloadcms/translations/languages/fr'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  // v1 : une seule collection d'authentification. Les collections métier
  // (Danse, Position, Passe, Enchainement, Favori) arrivent aux Epics 2/3.
  collections: [Users],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // AD-1 / AD-10 : SQLite (libSQL) via l'adaptateur Drizzle de Payload,
  // seul scribe de la base. En dev, fichier local ; en prod, volume persistant.
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URI || 'file:./passe-finder.db',
    },
  }),
  sharp,
  // NFR-7 : back-office en français (identifiants de code en anglais,
  // libellés/domaine/UI en français).
  i18n: {
    supportedLanguages: { fr },
    fallbackLanguage: 'fr',
  },
})
