import { getPayload } from 'payload'

import config from '../src/payload.config'

/**
 * Promotion d'un compte au rang d'ADMINISTRATEUR (Story 3.4, FR-29).
 *
 * POURQUOI UN SCRIPT, ET PAS AUTRE CHOSE.
 * Le drapeau `admin` ne peut pas s'attribuer depuis l'application : l'acces de
 * champ sur `users.admin` le refuse a quiconque n'est pas deja administrateur,
 * et c'est precisement ce que demande la story (aucune auto-promotion). Il faut
 * donc une porte exterieure. Trois formes ont ete examinees avec Alain :
 *
 *  - une variable d'environnement lue au demarrage : marche, mais impose un
 *    secret CI et un redeploiement pour un geste qu'on fait une fois, et ajoute
 *    du travail a CHAQUE demarrage ;
 *  - une migration Payload promouvant « le premier ID » : ecartee. Les
 *    migrations tournent AVANT le demarrage du serveur (docker-entrypoint.sh),
 *    donc sur une instance neuve la table est VIDE : la migration ne trouve
 *    personne, ne fait rien, et Payload l'enregistre quand meme comme
 *    appliquee. Elle ne repasserait jamais et l'instance n'aurait jamais
 *    d'administrateur. C'est le meme defaut tout-ou-rien que l'ancien import
 *    conditionnel du catalogue. De plus, en developpement, le schema est
 *    synchronise en `push` : les migrations n'y tournent pas du tout ;
 *  - CE SCRIPT, lance a la main, une fois, quand le compte existe. Meme geste
 *    et meme place que `migrate:enchainements`, dont la reprise du catalogue a
 *    montre que la forme convenait.
 *
 * IDEMPOTENT : relancer sur un compte deja administrateur ne fait rien.
 *
 * Lancement :
 *   npm run promouvoir:admin -- email@exemple.fr
 *   npm run promouvoir:admin            (si un seul compte existe)
 */
async function main() {
  const payload = await getPayload({ config })

  console.log('--- Promotion administrateur ---')

  const emailDemande = process.argv[2]?.trim().toLowerCase()

  // Sans email, on n'accepte de deviner QUE s'il n'y a aucune ambiguite. C'est
  // la nuance qui separe ce script d'une heuristique « premier ID » : le cas
  // « un seul compte » est reconnu, le cas ambigu est REFUSE au lieu d'etre
  // tranche au hasard. Donner les cles du catalogue au mauvais compte serait
  // silencieux, et personne ne le remarquerait avant un degat.
  const comptes = await payload.find({
    collection: 'users',
    ...(emailDemande ? { where: { email: { equals: emailDemande } } } : {}),
    limit: 2,
    depth: 0,
  })

  if (comptes.totalDocs === 0) {
    throw new Error(
      emailDemande
        ? `Aucun compte « ${emailDemande} ». Cree-le d'abord dans /admin, puis relance.`
        : "Aucun compte en base. Cree ton compte dans /admin, puis relance.",
    )
  }

  if (comptes.totalDocs > 1) {
    throw new Error(
      'Plusieurs comptes existent : precise lequel promouvoir, ' +
        'ex. `npm run promouvoir:admin -- email@exemple.fr`.',
    )
  }

  const compte = comptes.docs[0]

  if (compte.admin) {
    console.log(`Deja administrateur : ${compte.email}`)
    console.log('Rien a faire.')
    process.exit(0)
  }

  await payload.update({
    collection: 'users',
    id: compte.id,
    data: { admin: true },
  })

  // On relit au lieu de faire confiance a l'ecriture : c'est l'etat en base qui
  // fait foi, et une verification qui ne verifie rien ne vaut rien.
  const relu = await payload.findByID({ collection: 'users', id: compte.id, depth: 0 })

  if (!relu.admin) {
    throw new Error(`Echec : le drapeau n'est pas pose sur ${compte.email}.`)
  }

  console.log(`Compte promu administrateur : ${relu.email}`)
  console.log("Il peut desormais editer le catalogue (danses, positions, passes, fichiers),")
  console.log('et designer d autres administrateurs depuis /admin.')

  process.exit(0)
}

main().catch((e) => {
  console.error('Echec de la promotion :', e instanceof Error ? e.message : e)
  process.exit(1)
})
