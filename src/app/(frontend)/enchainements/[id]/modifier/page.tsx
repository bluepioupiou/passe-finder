import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { Compositeur } from '@/components/Compositeur'
import { SuppressionEnchainement } from '@/components/SuppressionEnchainement'
import { chargerCatalogue, vuesDuCatalogue } from '@/catalogue'
import { VISIBILITES } from '@/collections/Enchainement'
import { dateDuJour, isoVersJour, reprendreChaine, type VuePasse } from '@/composition'
import { identifiant, peutModifier } from '@/enchainements'
import config from '@/payload.config'
import { exigerSession } from '@/porte'
import { modifierEnchainement, supprimerEnchainement } from './actions'
import '../fiche-enchainement.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Modifier un enchaînement — Passe Finder',
}

/**
 * Modifier un enchaînement (Story 4.5, FR-18).
 *
 * TROIS GARDES, INDÉPENDANTES, dans cet ordre :
 *  1. la porte (`exigerSession`) emmène un anonyme vers la connexion en gardant
 *     le chemin, plutôt que de lui montrer un formulaire qu'il ne pourra pas
 *     enregistrer (Story 3.5) ;
 *  2. la lecture passe par les `access` de la collection : un enchaînement
 *     privé qui n'est pas le sien n'est tout simplement pas trouvé ;
 *  3. `peutModifier` écarte celui qui peut LIRE sans pouvoir écrire — un
 *     enchaînement partagé par quelqu'un d'autre.
 *
 * Les cas 2 et 3 répondent tous deux 404, jamais « interdit » : un refus
 * apprendrait à qui tâtonne qu'il y a bien quelque chose ici. C'est la même
 * réponse que la fiche pour un enchaînement privé.
 *
 * Aucune de ces trois gardes ne SÉCURISE à elle seule : les actions revérifient,
 * et la collection tranche en dernier ressort (ADD-5).
 *
 * LA CHAÎNE EST MODIFIABLE ICI depuis le 2026-09-01 : cet écran rouvre LE
 * compositeur sur l'enchaînement existant, comme le demandait l'AC de la story.
 * L'écran de saisie seule qu'il remplace était un demi-geste — on pouvait
 * corriger le titre d'un enchaînement, mais pas la passe qu'on s'était trompé
 * de choisir, ce qui est pourtant la faute qu'on fait en composant.
 *
 * LES RÈGLES DE COMPOSITION NE CHANGENT PAS : on prolonge par la fin, on
 * raccourcit pas à pas, on n'insère pas au milieu (FR-13, FR-15). Changer la
 * troisième passe d'une chaîne de dix demande donc d'en retirer sept — c'est
 * assumé : l'alternative serait un éditeur de chaîne libre, qui n'aurait plus
 * aucun moyen de garantir que la suite reste dansable.
 */
export default async function ModifierEnchainement({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const chemin = `/enchainements/${id}/modifier`
  const utilisateur = await exigerSession(chemin)

  const payload = await getPayload({ config: await config })
  const enchainement = await payload
    .findByID({
      collection: 'enchainements',
      id,
      depth: 0,
      disableErrors: true,
      overrideAccess: false,
      user: utilisateur,
    })
    .catch(() => null)

  if (!enchainement) notFound()
  if (!peutModifier(enchainement, utilisateur)) notFound()

  const fiche = `/enchainements/${enchainement.id}`

  // Le catalogue entier tient en mémoire et se lit en trois requêtes ; le
  // compositeur n'en reçoit que la projection dont il a besoin.
  const { positions, passes, transitions } = vuesDuCatalogue(await chargerCatalogue(payload))
  const parId = new Map(passes.map((passe) => [passe.id, passe]))

  // Une passe introuvable est ÉCARTÉE plutôt que de faire tomber la page : le
  // blocage de suppression (FR-8, ADD-8) rend le cas improbable, et une chaîne
  // amputée d'un maillon reste réparable — une page en erreur, non. Même règle
  // que `chaineDe` côté lecture.
  const chaineExistante = enchainement.passes.flatMap((maillon): VuePasse[] => {
    const idPasse = identifiant(maillon.passe)
    const vue = idPasse === null ? undefined : parId.get(idPasse)

    return vue ? [vue] : []
  })

  const { depart, chaine } = reprendreChaine(chaineExistante)

  return (
    <div className="contenu-page">
      <p className="fiche-fil">
        <Link href={fiche}>{enchainement.titre}</Link>
      </p>

      <header className="fiche-enchainement-entete">
        <h1>Modifier</h1>
        <p className="texte-attenue">
          La chaîne se reprend là où elle en est : tu peux la prolonger depuis la fin, ou retirer
          les dernières passes une à une pour repartir autrement.
        </p>
      </header>

      <Compositeur
        positions={positions}
        passes={passes}
        transitions={transitions}
        // IGNORÉ EN REPRISE : la date vient de `initial`, et un enchaînement
        // sans date doit s'ouvrir sur un champ VIDE. Le pré-remplir avec
        // aujourd'hui daterait au passage un enchaînement qu'on rouvrait pour
        // en corriger le titre. La propriété reste requise plutôt que d'ajouter
        // au compositeur un cas de plus à porter.
        dateParDefaut={dateDuJour()}
        visibilites={[...VISIBILITES]}
        enregistrer={modifierEnchainement.bind(null, enchainement.id)}
        initial={{
          depart,
          chaine,
          informations: {
            titre: enchainement.titre,
            date: isoVersJour(enchainement.date),
            description: enchainement.description ?? '',
            musique: {
              titre: enchainement.musique?.titre ?? '',
              lien: enchainement.musique?.lien ?? '',
            },
            video: enchainement.urlVideo ?? '',
            notes: enchainement.notes ?? '',
            visibilite: enchainement.visibilite,
          },
        }}
        retour={fiche}
      />

      <SuppressionEnchainement
        id={enchainement.id}
        titre={enchainement.titre}
        supprimer={supprimerEnchainement}
      />
    </div>
  )
}
