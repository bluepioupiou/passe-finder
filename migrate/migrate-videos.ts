import { getPayload } from 'payload'

import config from '../src/payload.config'
import { extraireTable, lireDump } from './dump-legacy'

/**
 * Migration one-off — LES VIDEOS DES ENCHAINEMENTS HISTORIQUES.
 *
 * Oubliee de la tranche « enchainements » (Story 6.3) : le dump porte une table
 * `video` que `migrate:enchainements` ne lisait pas. Resultat, 119 enchainements
 * migres et pas un seul lien video, alors que la source en porte 71.
 *
 * A executer APRES `migrate:enchainements` : chaque video se raccroche a un
 * enchainement deja migre, retrouve par son `legacyId` (ordre de dependance,
 * AD-14).
 *
 * TROIS PARTICULARITES DE LA SOURCE, tranchees avec Alain le 2026-09-05 :
 *
 * 1. `video.youtube_url` ne porte PAS une URL mais l'identifiant YouTube nu
 *    (« HvZaXG0nyUk »). L'ancienne appli le recollait dans son gabarit
 *    d'affichage. On reconstruit donc l'adresse complete : c'est la seule forme
 *    que le champ accepte (la validation de `urlVideo` exige http(s)) et la
 *    seule que `presenterVideo` sait nommer.
 *
 * 2. Le modele cible n'a qu'UN champ video par enchainement (choix assume, voir
 *    `src/video.ts`), or deux enchainements en portent plusieurs : le 113 en a 2
 *    (deux angles de la meme figure) et le 118 en a 7 (les seances d'un meme
 *    cours). On garde LA PLUS ANCIENNE — le plus petit `video.id` — parce que
 *    c'est celle que l'ancienne appli montrait en tete, et parce que dans les
 *    deux cas c'est la vue principale, les suivantes etant un angle inverse ou
 *    un a-cote. Les ecartees ne se perdent pas : toutes sont archivees dans
 *    `legacyMeta.videos`, avec leur description.
 *
 * 3. Un identifiant est tronque (`xdHXUlRIMw`, 10 caracteres au lieu de 11, sur
 *    l'enchainement 7). Il ne mene nulle part : on ne pose pas un lien mort, on
 *    le signale et on l'archive comme les autres.
 *
 * Principes (FR-31, FR-32, AD-1, AD-8) :
 *  - ecriture exclusivement via l'API Local de Payload ;
 *  - REJOUABLE : un enchainement qui a deja une video n'est pas retouche, ce
 *    qui protege du meme geste les liens saisis a la main depuis la migration ;
 *  - VERIFIABLE : comptage source vs cible en fin d'execution.
 *
 * Lancement : npm run migrate:videos
 */

type VideoLegacy = {
  id: string
  name: string
  description: string
  enchainement_id: string
  dateCreate: string
  dateMaj: string
  youtube_url: string
  userCreate_id: string
}

const COLONNES_VIDEO = [
  'id',
  'name',
  'description',
  'enchainement_id',
  'dateCreate',
  'dateMaj',
  'youtube_url',
  'userCreate_id',
]

/** Un identifiant YouTube fait onze caracteres de l'alphabet base64 URL. */
const IDENTIFIANT_YOUTUBE = /^[A-Za-z0-9_-]{11}$/

/** `NULL` non quote dans le dump : on le ramene a `undefined`. */
function valeur(brut: string | undefined): string | undefined {
  if (!brut || brut === 'NULL' || brut.trim() === '') return undefined
  return brut
}

/** L'adresse complete que l'ancienne appli recollait a l'affichage. */
function urlYouTube(identifiant: string): string {
  return `https://www.youtube.com/watch?v=${identifiant}`
}

async function main() {
  const payload = await getPayload({ config })

  console.log('--- Migration des videos des enchainements historiques ---')

  const videos = extraireTable<VideoLegacy>(lireDump(), 'video', COLONNES_VIDEO)

  // Regroupees par enchainement, la plus ancienne d'abord.
  const parEnchainement = new Map<string, VideoLegacy[]>()
  for (const video of videos) {
    const liste = parEnchainement.get(video.enchainement_id) ?? []
    liste.push(video)
    parEnchainement.set(video.enchainement_id, liste)
  }
  for (const liste of parEnchainement.values()) {
    liste.sort((a, b) => Number(a.id) - Number(b.id))
  }

  console.log('Videos dans le dump          : ' + videos.length)
  console.log('Enchainements concernes      : ' + parEnchainement.size)

  let posees = 0
  let dejaRenseignees = 0
  let ecartees = 0
  let introuvables = 0
  const avertissements: string[] = []

  for (const [enchainementLegacyId, liste] of parEnchainement) {
    const legacyId = Number(enchainementLegacyId)

    // `showHiddenFields` : `legacyId` et `legacyMeta` sont masques des reponses
    // d'API (AD-8), il faut les demander explicitement.
    const trouves = await payload.find({
      collection: 'enchainements',
      where: { legacyId: { equals: legacyId } },
      limit: 1,
      depth: 0,
      showHiddenFields: true,
    })
    const enchainement = trouves.docs[0]
    if (!enchainement) {
      introuvables++
      avertissements.push(
        `Enchainement ${legacyId} absent de la base : ${liste.length} video(s) sans ` +
          'destination. Lancer `npm run migrate:enchainements` avant.',
      )
      continue
    }

    // Toutes archivees, y compris celle qui devient le lien affiche : l'archive
    // dit ce que la source portait, pas ce qu'il en reste.
    const archive = liste.map((v) => ({
      id: Number(v.id),
      youtubeId: v.youtube_url,
      description: valeur(v.description) ?? null,
      dateCreate: valeur(v.dateCreate) ?? null,
      userCreateId: Number(v.userCreate_id),
    }))
    const legacyMeta = {
      ...((enchainement.legacyMeta as Record<string, unknown> | null | undefined) ?? {}),
      videos: archive,
    }

    const retenue = liste.find((v) => IDENTIFIANT_YOUTUBE.test(v.youtube_url))
    if (retenue) {
      ecartees += liste.length - 1
    } else {
      avertissements.push(
        `Enchainement ${legacyId} « ${enchainement.titre} » laisse sans lien : ` +
          `identifiant inexploitable (${liste.map((v) => v.youtube_url).join(', ')}). Archive.`,
      )
    }

    const dejaPosee = ((enchainement.urlVideo as string | null | undefined) ?? '').trim() !== ''
    if (retenue && dejaPosee) dejaRenseignees++

    await payload.update({
      collection: 'enchainements',
      id: enchainement.id,
      data: {
        // Rejouabilite (FR-32) : on ne recouvre jamais un lien deja la.
        ...(retenue && !dejaPosee ? { urlVideo: urlYouTube(retenue.youtube_url) } : {}),
        legacyMeta,
      },
    })
    if (retenue && !dejaPosee) posees++
  }

  const avecVideo = await payload.count({
    collection: 'enchainements',
    where: { urlVideo: { exists: true } },
  })

  console.log('')
  console.log('--- Rapport ---')
  console.log('Liens poses cette fois       : ' + posees)
  console.log('Deja renseignes (respectes)  : ' + dejaRenseignees)
  console.log('Videos ecartees (archivees)  : ' + ecartees)
  console.log('Enchainements introuvables   : ' + introuvables)
  console.log('Enchainements avec video     : ' + avecVideo.totalDocs)
  if (avertissements.length) {
    console.log('')
    console.log('Avertissements :')
    avertissements.forEach((a) => console.log('  - ' + a))
  }

  // Un lien pose, ou deja la, pour chaque enchainement dont la source porte au
  // moins un identifiant exploitable : c'est le compte que la source promet.
  const attendu = [...parEnchainement.values()].filter((liste) =>
    liste.some((v) => IDENTIFIANT_YOUTUBE.test(v.youtube_url)),
  ).length
  const conforme = posees + dejaRenseignees === attendu && introuvables === 0
  console.log('')
  console.log(
    conforme
      ? 'OK : le comptage cible correspond a la source.'
      : 'ECART : attendu ' + attendu + ', obtenu ' + (posees + dejaRenseignees),
  )

  process.exit(conforme ? 0 : 1)
}

main().catch((e) => {
  console.error('Echec de la migration :', e)
  process.exit(1)
})
