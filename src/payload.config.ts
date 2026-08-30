import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { fr } from '@payloadcms/translations/languages/fr'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { DATABASE_URI, PAYLOAD_SECRET } from './env'
import { Danse } from './collections/Danse'
import { Enchainement } from './collections/Enchainement'
import { Media } from './collections/Media'
import { Passe } from './collections/Passe'
import { Position } from './collections/Position'
import { initialiser } from './seed'
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
  // arrivent aux Epics 2/4 ; Favori suivra à l'Epic 5.
  collections: [Users, Danse, Media, Position, Passe, Enchainement],
  editor: lexicalEditor(),
  secret: PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // AD-1 / AD-10 : SQLite (libSQL) via l'adaptateur Drizzle de Payload,
  // seul scribe de la base. En dev, fichier local ; en prod, volume persistant.
  db: sqliteAdapter({
    client: {
      url: DATABASE_URI,
    },
    // Dev : Payload synchronise le schéma automatiquement (push par défaut).
    // Prod : le schéma est appliqué par les migrations (`payload migrate`,
    // lancé au démarrage du conteneur, cf. docker-entrypoint.sh). Toute
    // évolution de collection nécessite un `npm run payload -- migrate:create`.
  }),
  sharp,
  // Semis de demarrage, idempotent : danse de reference (v1 mono-danse) et
  // attribution du drapeau `admin` hors application (Story 3.4, ADMIN_EMAIL).
  // En production, l'entrypoint applique d'abord les migrations, donc le schema
  // existe deja ; en developpement, Payload synchronise le schema avant onInit.
  onInit: initialiser,
  // NFR-7 : back-office en français (identifiants de code en anglais,
  // libellés/domaine/UI en français).
  i18n: {
    supportedLanguages: { fr },
    fallbackLanguage: 'fr',
  },
})
