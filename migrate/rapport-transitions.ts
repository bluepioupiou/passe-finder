import { getPayload } from 'payload'

import config from '../src/payload.config'
import { chargerCatalogue } from '../src/catalogue'
import { chaineDe, cleDeTransition, construireChaine } from '../src/enchainements'

/**
 * Rapport de couverture des transitions (Story 4.7) — LECTURE SEULE.
 *
 * Ce script n'ecrit rien. Il repond a une seule question : quelles reprises de
 * l'historique ne sont pas encore expliquees par une transition declaree ?
 *
 * POURQUOI UN RAPPORT PLUTOT QUE DE CREER LES ARETES MANQUANTES. Une transition
 * sans description n'est qu'une permission ; avec elle, c'est du contenu de
 * cours (« il vous suffit juste de lacher votre main gauche »). Les inventer a
 * la place d'Alain reviendrait a fabriquer une dizaine d'aretes muettes en son
 * nom. Le script montre donc OU chercher, et il les trie par frequence : les
 * plus dansees d'abord, ce sont celles qui rendent service tout de suite.
 *
 * Il utilise EXACTEMENT la meme detection que la vue lecture
 * (`construireChaine`) : ce qu'il compte est ce que le site affiche, jamais une
 * seconde regle qui pourrait diverger.
 *
 * Lancement : npm run rapport:transitions
 */

/** Nombre d'enchainements cites en exemple pour chaque couple manquant. */
const EXEMPLES = 3

type Manquante = { debut: string; fin: string; total: number; exemples: string[] }

async function main() {
  const payload = await getPayload({ config })

  console.log('--- Couverture des transitions ---')

  const catalogue = await chargerCatalogue(payload)

  const { docs: enchainements } = await payload.find({
    collection: 'enchainements',
    limit: 1000,
    depth: 0,
    // Le rapport porte sur TOUT l'historique, y compris les enchainements
    // prives : ce sont des reprises reellement dansees comme les autres.
    overrideAccess: true,
  })

  const manquantes = new Map<string, Manquante>()
  const utilisees = new Set<string>()
  let ruptures = 0
  let nommees = 0
  let discontinus = 0

  for (const enchainement of enchainements) {
    const maillons = construireChaine(
      chaineDe(enchainement.passes, catalogue.passes, catalogue.positions),
      catalogue.transitions,
    )

    let aUneRupture = false

    for (const maillon of maillons) {
      const { rupture } = maillon
      if (!rupture) continue

      ruptures++
      aUneRupture = true

      const cle = cleDeTransition(rupture.arrivait, rupture.reprend)
      if (cle === null) continue

      if (rupture.transition) {
        nommees++
        utilisees.add(cle)
        continue
      }

      const connue = manquantes.get(cle)
      if (connue) {
        connue.total++
        if (connue.exemples.length < EXEMPLES) connue.exemples.push(enchainement.titre)
      } else {
        manquantes.set(cle, {
          debut: rupture.arrivait?.nom ?? '?',
          fin: rupture.reprend?.nom ?? '?',
          total: 1,
          exemples: [enchainement.titre],
        })
      }
    }

    if (aUneRupture) discontinus++
  }

  console.log('Enchainements analyses      : ' + enchainements.length)
  console.log('Dont contenant une reprise  : ' + discontinus)
  console.log('Reprises au total           : ' + ruptures)
  console.log('Dont deja nommees           : ' + nommees)
  console.log('Transitions declarees       : ' + catalogue.transitions.size)

  const aEcrire = [...manquantes.values()].sort((a, b) => b.total - a.total)
  const restant = aEcrire.reduce((somme, m) => somme + m.total, 0)

  console.log('')
  if (aEcrire.length === 0) {
    console.log('Toutes les reprises de l historique sont expliquees. Rien a ecrire.')
  } else {
    console.log(
      '--- A ECRIRE : ' +
        aEcrire.length +
        ' trajet(s), ' +
        restant +
        ' reprise(s) encore sans explication ---',
    )
    console.log('A creer dans /admin > Transitions. Le sens compte : A -> B n ouvre pas B -> A.')
    console.log('')
    for (const m of aEcrire) {
      console.log('  x' + String(m.total).padStart(3) + '  ' + m.debut + '  ->  ' + m.fin)
      console.log('        ex. ' + m.exemples.map((titre) => '« ' + titre + ' »').join(', '))
    }
  }

  // Une transition declaree que personne ne danse n'est pas une erreur (elle
  // peut servir demain, dans un enchainement a venir), mais elle merite d'etre
  // relue : dans le legacy, une des dix n'a jamais servi en quinze ans.
  const jamaisUtilisees = [...catalogue.transitions.entries()].filter(
    ([cle]) => !utilisees.has(cle),
  )

  if (jamaisUtilisees.length > 0) {
    console.log('')
    console.log('--- Declarees mais jamais dansees dans l historique ---')
    console.log('Rien d anormal, mais a relire : est-ce un geste qui a vraiment sa place ?')
    console.log('')
    for (const [, transition] of jamaisUtilisees) {
      const debut = catalogue.positions.get(
        typeof transition.positionDebut === 'number'
          ? transition.positionDebut
          : transition.positionDebut.id,
      )
      const fin = catalogue.positions.get(
        typeof transition.positionFin === 'number'
          ? transition.positionFin
          : transition.positionFin.id,
      )
      console.log('  - ' + (debut?.nom ?? '?') + '  ->  ' + (fin?.nom ?? '?'))
    }
  }

  process.exit(0)
}

main().catch((e) => {
  console.error('Echec du rapport :', e)
  process.exit(1)
})
