'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import type { ResultatEnregistrement, SaisieMetadonnees } from '@/composition'
import { Bouton } from './Bouton'
import { ChampsEnchainement, lienMusiqueInvalide } from './ChampsEnchainement'
import './compositeur.css'

/**
 * Modifier les informations d'un enchainement (Story 4.5, FR-18).
 *
 * Le formulaire ne connait NI Payload NI les droits : la page l'a deja refuse a
 * qui n'est pas l'auteur, et l'action le refuse a nouveau de son cote. Il ne
 * fait que tenir la saisie et la renvoyer.
 *
 * La CHAINE n'est pas ici, et c'est visible a l'ecran : on modifie ce qui se
 * tape, pas la suite des passes. La composer autrement se fera ailleurs, avec
 * le compositeur.
 *
 * UN ECHEC NE JETTE RIEN : le message s'affiche et la saisie reste a l'ecran
 * (NFR-4, UX-DR16). C'est la meme regle que le compositeur — perdre le travail
 * de quelqu'un pour une coupure reseau est la faute qu'on ne se pardonne pas.
 */
export function FormulaireEnchainement({
  id,
  valeursInitiales,
  visibilites,
  modifier,
}: {
  id: number
  valeursInitiales: SaisieMetadonnees
  visibilites: { label: string; value: string }[]
  modifier: (id: number, saisie: SaisieMetadonnees) => Promise<ResultatEnregistrement>
}) {
  const router = useRouter()

  const [informations, setInformations] = useState<SaisieMetadonnees>(valeursInitiales)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const lienInvalide = lienMusiqueInvalide(informations)
  const fiche = `/enchainements/${id}`

  const soumettre = async (evenement: React.FormEvent) => {
    evenement.preventDefault()
    if (enCours || lienInvalide) return

    setEnCours(true)
    setErreur(null)

    try {
      const resultat = await modifier(id, {
        ...informations,
        titre: informations.titre.trim(),
      })

      if (resultat.ok) {
        // On revient sur la fiche : la confirmation, c'est de voir le
        // changement. `refresh` force le rechargement des donnees du serveur,
        // sans quoi la fiche pourrait se rouvrir depuis le cache du routeur,
        // telle qu'elle etait avant.
        router.push(fiche)
        router.refresh()
        return
      }

      setErreur(resultat.message)
    } catch {
      setErreur(
        "La modification n'a pas abouti (connexion ?). Ta saisie est toujours là : réessaie.",
      )
    } finally {
      setEnCours(false)
    }
  }

  return (
    <form className="compo-bloc" onSubmit={soumettre}>
      <ChampsEnchainement
        valeurs={informations}
        surChangement={(partiel) =>
          setInformations((precedentes) => ({ ...precedentes, ...partiel }))
        }
        visibilites={visibilites}
      />

      {erreur ? (
        <p className="compo-erreur" role="alert">
          {erreur}
        </p>
      ) : null}

      <div className="compo-actions">
        <Bouton type="submit" disabled={enCours || lienInvalide}>
          {enCours ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </Bouton>

        {/* Annuler est un LIEN, pas un bouton : il ne fait rien d'autre que
            retourner d'ou l'on vient. */}
        <Bouton variante="fantome" href={fiche}>
          Annuler
        </Bouton>
      </div>
    </form>
  )
}
