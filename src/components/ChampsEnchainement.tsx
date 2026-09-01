'use client'

import React, { useId } from 'react'

import type { SaisieMetadonnees } from '@/composition'
import { lienSur } from '@/liens'
import './compositeur.css'

/**
 * Les informations d'un enchainement, en champs de saisie (Stories 4.3 / 4.5).
 *
 * EXTRAIT parce que DEUX ecrans les portent maintenant : le compositeur, qui
 * les remplit a la creation, et la page de modification, qui les reprend. Deux
 * jeux de champs recopies derivent — le jour ou l'on ajoute un champ d'un cote,
 * l'autre reste en arriere, et l'edition perd ce que la creation permet. C'est
 * la meme raison qui a fait extraire `CarteEnchainement`.
 *
 * La CHAINE de passes n'est PAS ici : elle ne se saisit pas, elle se compose
 * (le compositeur ne propose que des passes qui partent de la position courante,
 * FR-10). L'edition de la chaine reste a faire, et ce decoupage la laisse
 * possible sans rien defaire.
 *
 * Composant CONTROLE et sans etat : le parent tient les valeurs. Il n'y a donc
 * qu'une seule source de verite pour ce qui sera enregistre, et le parent peut
 * decider seul de ce qu'il en fait (creer, ou mettre a jour).
 *
 * Les classes restent en `compo-*`, partagees avec `compositeur.css` : ce sont
 * les memes champs, avec le meme rythme, et les dedoubler en une seconde feuille
 * ferait diverger deux apparences qui doivent rester identiques.
 */

/** Un lien saisi qui ne pourra pas etre ouvert. Vide = pas de faute. */
function inutilisable(valeur: string): boolean {
  return valeur.trim() !== '' && lienSur(valeur) === null
}

/** Quels liens sont inutilisables — pour les signaler champ par champ. */
export function liensInvalides(valeurs: SaisieMetadonnees): {
  musique: boolean
  video: boolean
} {
  return { musique: inutilisable(valeurs.musique.lien), video: inutilisable(valeurs.video) }
}

/**
 * Y a-t-il au moins un lien inutilisable ?
 *
 * Exporte parce que le BOUTON d'enregistrement vit chez le parent : c'est lui
 * qui doit se desactiver. Ecrite ici, la question a une seule reponse pour les
 * deux ecrans.
 */
export function auMoinsUnLienInvalide(valeurs: SaisieMetadonnees): boolean {
  const invalides = liensInvalides(valeurs)

  return invalides.musique || invalides.video
}

export function ChampsEnchainement({
  valeurs,
  surChangement,
  visibilites,
}: {
  valeurs: SaisieMetadonnees
  /** Recoit la seule partie qui change : le parent fusionne. */
  surChangement: (partiel: Partial<SaisieMetadonnees>) => void
  /**
   * Fournies par la page (donnees simples) et non importees de la collection :
   * ce fichier partant dans le navigateur, cet import y embarquerait Payload.
   */
  visibilites: { label: string; value: string }[]
}) {
  const idTitre = useId()
  const idDate = useId()
  const idVisibilite = useId()
  const idDescription = useId()
  const idMusiqueTitre = useId()
  const idMusiqueLien = useId()
  const idMusiqueErreur = useId()
  const idVideo = useId()
  const idVideoErreur = useId()
  const idNotes = useId()

  const invalides = liensInvalides(valeurs)

  return (
    <div className="compo-champs">
      <div className="compo-champ compo-champ--large">
        <label className="compo-label label-caps" htmlFor={idTitre}>
          Titre
        </label>
        <input
          id={idTitre}
          type="text"
          className="compo-saisie"
          required
          placeholder="Cours du mardi, passes en main droite…"
          value={valeurs.titre}
          onChange={(evenement) => surChangement({ titre: evenement.target.value })}
        />
      </div>

      <div className="compo-champ">
        <label className="compo-label label-caps" htmlFor={idDate}>
          Date
        </label>
        {/* Aujourd'hui par defaut, modifiable : on note souvent le cours le
            lendemain, et un enchainement ancien se saisit a sa date. */}
        <input
          id={idDate}
          type="date"
          className="compo-saisie"
          value={valeurs.date}
          onChange={(evenement) => surChangement({ date: evenement.target.value })}
        />
      </div>

      <div className="compo-champ">
        <label className="compo-label label-caps" htmlFor={idVisibilite}>
          Visibilité
        </label>
        {/* Prive en premier, donc par defaut : on ne partage jamais par
            accident (FR-17, AD-6). */}
        <select
          id={idVisibilite}
          className="compo-saisie"
          value={valeurs.visibilite}
          onChange={(evenement) => surChangement({ visibilite: evenement.target.value })}
        >
          {visibilites.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="compo-champ compo-champ--large">
        <label className="compo-label label-caps" htmlFor={idDescription}>
          Description
        </label>
        <textarea
          id={idDescription}
          className="compo-saisie compo-saisie--zone"
          rows={3}
          placeholder="Ce qu'il faut retenir de l'enchaînement."
          value={valeurs.description}
          onChange={(evenement) => surChangement({ description: evenement.target.value })}
        />
      </div>

      {/* La musique appartient a l'enchainement : on danse une choregraphie
          SUR un morceau. Deux champs et non un, parce que le TITRE survit au
          lien mort — quatre des cinq musiques de l'historique pointaient
          vers des fichiers de l'ancien site, disparus avec lui. */}
      <div className="compo-champ">
        <label className="compo-label label-caps" htmlFor={idMusiqueTitre}>
          Musique
        </label>
        <input
          id={idMusiqueTitre}
          type="text"
          className="compo-saisie"
          placeholder="Gene Vincent — Be-Bop-A-Lula"
          value={valeurs.musique.titre}
          onChange={(evenement) =>
            surChangement({ musique: { ...valeurs.musique, titre: evenement.target.value } })
          }
        />
        <p className="compo-indice texte-attenue">
          Laisse vide et colle un lien : le titre est récupéré tout seul, quand le fournisseur le
          publie.
        </p>
      </div>

      <div className="compo-champ">
        <label className="compo-label label-caps" htmlFor={idMusiqueLien}>
          Lien de la musique
        </label>
        <input
          id={idMusiqueLien}
          type="url"
          inputMode="url"
          className="compo-saisie"
          placeholder="https://open.spotify.com/…"
          value={valeurs.musique.lien}
          onChange={(evenement) =>
            surChangement({ musique: { ...valeurs.musique, lien: evenement.target.value } })
          }
          aria-invalid={invalides.musique || undefined}
          aria-describedby={invalides.musique ? idMusiqueErreur : undefined}
        />
        {invalides.musique ? (
          <p id={idMusiqueErreur} className="compo-erreur-champ" role="alert">
            Il faut une adresse web (http:// ou https://).
          </p>
        ) : null}
      </div>

      {/* La VIDEO montre l'execution, la musique est ce sur quoi on danse :
          deux champs, deux usages. Un seul champ ici, sans titre a saisir —
          une video de cours ne se nomme pas, elle se regarde. */}
      <div className="compo-champ compo-champ--large">
        <label className="compo-label label-caps" htmlFor={idVideo}>
          Lien de la vidéo
        </label>
        <input
          id={idVideo}
          type="url"
          inputMode="url"
          className="compo-saisie"
          placeholder="https://www.youtube.com/watch?v=…"
          value={valeurs.video}
          onChange={(evenement) => surChangement({ video: evenement.target.value })}
          aria-invalid={invalides.video || undefined}
          aria-describedby={invalides.video ? idVideoErreur : undefined}
        />
        {invalides.video ? (
          <p id={idVideoErreur} className="compo-erreur-champ" role="alert">
            Il faut une adresse web (http:// ou https://).
          </p>
        ) : null}
      </div>

      <div className="compo-champ compo-champ--large">
        <label className="compo-label label-caps" htmlFor={idNotes}>
          Notes
        </label>
        <textarea
          id={idNotes}
          className="compo-saisie compo-saisie--zone"
          rows={3}
          placeholder="Points de vigilance, variantes…"
          value={valeurs.notes}
          onChange={(evenement) => surChangement({ notes: evenement.target.value })}
        />
      </div>
    </div>
  )
}
