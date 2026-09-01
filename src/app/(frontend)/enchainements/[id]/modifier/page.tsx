import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { FormulaireEnchainement } from '@/components/FormulaireEnchainement'
import { VISIBILITES } from '@/collections/Enchainement'
import { isoVersJour } from '@/composition'
import { peutModifier } from '@/enchainements'
import config from '@/payload.config'
import { exigerSession } from '@/porte'
import { modifierEnchainement } from './actions'
import '../fiche-enchainement.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Modifier un enchaînement — Passe Finder',
}

/**
 * Modifier les informations d'un enchaînement (Story 4.5, FR-18).
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
 * Aucune de ces trois gardes ne SÉCURISE à elle seule : l'action revérifie, et
 * la collection tranche en dernier ressort (ADD-5).
 *
 * LA CHAÎNE N'EST PAS MODIFIABLE ICI (décision d'Alain, 2026-08-31) : cet écran
 * reprend ce qui se tape — titre, date, description, notes, musique,
 * visibilité. Recomposer la suite des passes est un autre geste, qui demandera
 * de rouvrir le compositeur sur un enchaînement existant.
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

  return (
    <div className="contenu-page">
      <p className="fiche-fil">
        <Link href={`/enchainements/${enchainement.id}`}>{enchainement.titre}</Link>
      </p>

      <header className="fiche-enchainement-entete">
        <h1>Modifier</h1>
        <p className="texte-attenue">
          La chaîne de passes n’est pas modifiable ici : elle se recompose dans le compositeur.
        </p>
      </header>

      <FormulaireEnchainement
        id={enchainement.id}
        valeursInitiales={{
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
        }}
        visibilites={[...VISIBILITES]}
        modifier={modifierEnchainement}
      />
    </div>
  )
}
