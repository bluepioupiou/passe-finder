'use server'

import { getPayload, type Payload } from 'payload'

import { DANSE_V1 } from '@/collections/Danse'
import config from '@/payload.config'
import { sessionCourante } from '@/porte'
import { nomDeFichier, pngDeSchema } from '@/rendu-position-png'
import { PIECES_MAX, schemaSur, type ResultatPosition, type SaisiePosition } from '@/schema-position'

/**
 * Enregistrer un schema de position : le PNG et la position, en un geste.
 *
 * UNE SEULE ACTION POUR CREER ET POUR MODIFIER, parce que c'est un seul bouton
 * dans la tete d'Alain — `id: null` signifie « creation ». Meme forme que
 * `enchainements/[idPublic]/modifier/actions.ts` : validation pure d'abord,
 * union discriminee en retour, messages en francais, et JAMAIS de `redirect()`
 * depuis l'action (une redirection se declenche par une exception, ce qui
 * rendrait un succes indistinguable d'un echec cote appelant).
 *
 * DEUXIEME DES TROIS GARDES. La page a deja filtre le parcours
 * (`exigerSession` + `estAdmin`), la collection tranchera en dernier ressort
 * (`Position.access` et `Media.access`, tous deux `adminSeul`). Ici on
 * revérifie la session et on passe `overrideAccess: false, user` — sans ce
 * drapeau, l'API Local de Payload court-circuite les droits.
 */
/** La danse de la v1. Le catalogue est mono-danse (ADD-18) ; le selecteur
 *  n'existe pas encore, et le champ doit pourtant etre rempli. */
async function danseDeReference(payload: Payload): Promise<number> {
  const danses = await payload.find({
    collection: 'danses',
    where: { nom: { equals: DANSE_V1 } },
    limit: 1,
    depth: 0,
  })

  const danse = danses.docs[0]
  if (!danse) throw new Error(`Danse « ${DANSE_V1} » absente : la base n’a pas été initialisée.`)
  return danse.id as number
}

export async function enregistrerSchemaPosition(
  saisie: SaisiePosition,
): Promise<ResultatPosition> {
  // ── Validation pure, hors du `try` ───────────────────────────────────────
  const nom = saisie.nom.trim()
  if (nom === '') return { ok: false, message: 'Il manque un nom à cette position.' }

  const schema = schemaSur(saisie.schema)
  if (!schema) {
    return { ok: false, message: 'Le schéma est illisible. Recharge la page et recommence.' }
  }

  // Le filet contre le scenario destructeur : un schema vide qui ecraserait
  // une composition existante et son image.
  if (schema.pieces.length === 0) {
    return { ok: false, message: 'Un schéma contient au moins une pièce.' }
  }
  if (schema.pieces.length > PIECES_MAX) {
    return { ok: false, message: `Ce schéma dépasse ${PIECES_MAX} pièces.` }
  }

  const description = saisie.description.trim()

  try {
    const payload = await getPayload({ config: await config })
    const utilisateur = await sessionCourante()

    if (!utilisateur) {
      // On ne redirige pas : le schema reste a l'ecran, rien n'est perdu.
      return {
        ok: false,
        message: 'Session expirée : reconnecte-toi, puis relance l’enregistrement.',
      }
    }

    const png = await pngDeSchema(schema)

    // Le media est cree EN MEMOIRE : une action serveur n'a pas de chemin
    // disque a donner, contrairement aux scripts de migration qui passent
    // `filePath`. La forme des quatre cles est celle du type `File` de Payload.
    const media = await payload.create({
      collection: 'media',
      overrideAccess: false,
      user: utilisateur,
      data: { alt: nom },
      file: {
        data: png,
        mimetype: 'image/png',
        name: nomDeFichier(nom),
        size: png.byteLength,
      },
    })

    try {
      const position = saisie.id
        ? await payload.update({
            collection: 'positions',
            id: saisie.id,
            overrideAccess: false,
            user: utilisateur,
            data: {
              nom,
              description: description || null,
              image: media.id,
              schemaCompose: schema,
            },
          })
        : await payload.create({
            collection: 'positions',
            overrideAccess: false,
            user: utilisateur,
            data: {
              nom,
              description: description || null,
              image: media.id,
              schemaCompose: schema,
              // `danse` est requis par le type, et le `beforeValidate` de la
              // collection saurait le remplir seul (v1 mono-danse). On le
              // fournit quand meme, comme le fait `migrate/migrate-positions.ts` :
              // le hook reste le filet, il n'est pas la seule corde.
              danse: await danseDeReference(payload),
            },
          })

      return { ok: true, id: position.id as number }
    } catch (erreur) {
      // MENAGE. Le media existe deja ; si la position echoue, le laisser en
      // ferait un orphelin — le dossier `media-orphelins-quarantaine/` a la
      // racine montre que ce projet en a deja souffert. Au mieux qu'on peut :
      // un echec du menage ne doit pas masquer l'erreur d'origine.
      await payload
        .delete({ collection: 'media', id: media.id, overrideAccess: false, user: utilisateur })
        .catch(() => {})
      throw erreur
    }
  } catch (erreur) {
    // Les `APIError` des collections portent deja des messages ecrits pour un
    // humain (voir le `beforeDelete` de `Position`) : on les laisse passer.
    const message =
      erreur instanceof Error && erreur.message
        ? erreur.message
        : "L'enregistrement n'a pas abouti. Réessaie dans un instant."
    return { ok: false, message }
  }
}

/**
 * NOTE SUR L'ANCIENNE IMAGE. Elle n'est jamais supprimee en v1 : pour les
 * vignettes historiques c'est l'archive du travail d'Alain, et pour les
 * rééditions ce sont des fichiers de quelques dizaines de kilo-octets. Un
 * script de menage viendra plus tard, avec les autres.
 */
