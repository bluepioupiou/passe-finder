'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect, useId, useRef, useState } from 'react'

import type { ChoixAuteur } from '@/auteurs'
import { lienListe, type Criteres } from '@/enchainements-liste'
import { Bouton } from './Bouton'
import { IconeChevron } from './Icones'
import './grille-filtrable.css'

/**
 * Les filtres de la liste des enchaînements (demande d'Alain, 2026-08-31).
 *
 * IL ÉCRIT DANS L'URL, il ne filtre rien lui-même. C'est la contrepartie de la
 * pagination : le tri vit dans la requête serveur, sinon on ne filtrerait que
 * la page affichée. Ce composant ne fait donc que traduire une saisie en
 * adresse, et laisser la page se recharger avec.
 *
 * LA FRAPPE EST DIFFÉRÉE (300 ms), les autres critères partent tout de suite.
 * Sans ce délai, chaque lettre déclencherait une navigation — et l'ancienne
 * version, qui filtrait en mémoire, répondait instantanément : il s'agit de
 * s'en approcher, pas de faire payer un aller-retour par caractère.
 *
 * TOUT CHANGEMENT DE FILTRE RAMÈNE À LA PAGE 1. Rester en page 4 après avoir
 * réduit la liste à deux résultats afficherait une page vide, sans rien dire de
 * pourquoi.
 *
 * REPLIÉ SUR TÉLÉPHONE (demande d'Alain, 2026-09-07). À six contrôles empilés,
 * la barre poussait la première carte sous la ligne de flottaison : on ouvrait
 * la liste des enchaînements et on voyait un formulaire. Elle se réduit donc à
 * un bouton, et se déplie au doigt.
 *
 * L'ÉTAT INITIAL VIENT DES CRITÈRES, pas d'un `false` : arriver par « Voir les
 * 59 enchaînements » depuis une fiche passe sur un panneau fermé afficherait
 * une liste amputée sans rien qui explique pourquoi. Un filtre actif ouvre donc
 * le panneau. Calculé au rendu SERVEUR, il est le même des deux côtés — aucun
 * décalage d'hydratation, et rien qui se déplie après coup sous les yeux.
 *
 * LE PLI EST UNE RÈGLE DE CSS, l'ouverture un état de React : le panneau est
 * caché sous 640px et TOUJOURS visible au-dessus, où la place ne manque pas.
 * Contrepartie assumée : sur téléphone SANS JavaScript, le panneau ne s'ouvre
 * plus. Le reste du formulaire dépend déjà de JavaScript pour naviguer au
 * changement (seule la touche Entrée s'en passe), et la recherche globale de la
 * barre de navigation reste, elle, un lien ordinaire.
 */
export function FiltresEnchainements({
  criteres,
  proposerFavoris,
  auteurs,
  passes,
  total,
}: {
  criteres: Criteres
  /**
   * Propose la case « Mes favoris ». La page en décide : elle seule sait s'il y
   * a une session ET au moins un favori. Une case qui ne peut rien donner est
   * pire que pas de case.
   */
  proposerFavoris: boolean
  /**
   * Les auteurs qu'on peut choisir. Tirés des enchaînements VISIBLES et non de
   * la table des comptes : le filtre ne doit rien apprendre que la liste
   * elle-même ne montre déjà (voir `auteursProposables`).
   */
  auteurs: ChoixAuteur[]
  /**
   * Les passes qu'on peut choisir : le CATALOGUE ENTIER, trié par nom.
   *
   * Contrairement aux auteurs, il n'y a rien à protéger — le catalogue est en
   * lecture publique (FR-21), et la fiche de chaque passe est déjà ouverte à
   * tous. Le restreindre aux passes réellement dansées coûterait une requête
   * d'agrégation pour retirer du menu des entrées qui, choisies, donnent une
   * réponse vraie : « aucun enchaînement n'utilise cette passe ».
   */
  passes: { id: number; nom: string }[]
  /** Nombre de résultats, pour l'annonce aux lecteurs d'écran. */
  total: number
}) {
  const router = useRouter()
  const idRecherche = useId()
  const idFavoris = useId()
  const idMusique = useId()
  const idVideo = useId()
  const idAuteur = useId()
  const idPasse = useId()
  const idPanneau = useId()

  // La saisie est tenue localement pour rester fluide sous les doigts ; l'URL,
  // elle, ne suit qu'après la pause.
  const [requete, setRequete] = useState(criteres.requete)
  // La case suit le doigt AVANT que la navigation n'aboutisse : liee a la seule
  // valeur de l'URL, elle se decocherait toute seule pendant l'aller-retour,
  // comme si le clic n'avait pas pris.
  const [cases, setCases] = useState({
    favorisSeuls: criteres.favorisSeuls,
    avecMusique: criteres.avecMusique,
    avecVideo: criteres.avecVideo,
  })
  const [derniereURL, setDerniereURL] = useState(criteres)
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null)

  // L'URL peut changer sans passer par ce champ : bouton « précédent » du
  // navigateur, lien « Tout afficher », arrivée depuis la recherche globale. Le
  // champ suit alors l'URL.
  //
  // Ajusté PENDANT LE RENDU et non dans un effet : un effet provoquerait un
  // second rendu en cascade (React le signale), et surtout un `key` qui
  // remonterait le composant ferait perdre le focus au champ à chaque
  // navigation — c'est-à-dire au milieu de la frappe.
  if (
    derniereURL.requete !== criteres.requete ||
    derniereURL.favorisSeuls !== criteres.favorisSeuls ||
    derniereURL.avecMusique !== criteres.avecMusique ||
    derniereURL.avecVideo !== criteres.avecVideo
  ) {
    setDerniereURL(criteres)
    setRequete(criteres.requete)
    setCases({
      favorisSeuls: criteres.favorisSeuls,
      avecMusique: criteres.avecMusique,
      avecVideo: criteres.avecVideo,
    })
  }

  useEffect(
    () => () => {
      if (minuterie.current) clearTimeout(minuterie.current)
    },
    [],
  )

  const naviguer = (suivants: Partial<Criteres>) => {
    router.push(lienListe({ ...criteres, page: 1, ...suivants }))
  }

  const saisir = (valeur: string) => {
    setRequete(valeur)
    if (minuterie.current) clearTimeout(minuterie.current)
    minuterie.current = setTimeout(() => naviguer({ requete: valeur }), 300)
  }

  /** Coche une case : l'affichage suit tout de suite, l'URL juste après. */
  const cocher = (nom: 'favorisSeuls' | 'avecMusique' | 'avecVideo', valeur: boolean) => {
    setCases((precedentes) => ({ ...precedentes, [nom]: valeur }))
    naviguer({ [nom]: valeur })
  }

  // Combien de critères sont posés. Le bouton le porte quand le panneau est
  // replié : sans ce nombre, une liste réduite n'aurait plus d'explication
  // visible à l'écran.
  const nombreDeCriteres = [
    criteres.requete !== '',
    criteres.favorisSeuls,
    criteres.avecMusique,
    criteres.avecVideo,
    criteres.auteur !== null,
    criteres.passe !== null,
  ].filter(Boolean).length

  const filtreActif = nombreDeCriteres > 0

  // Ouvert d'entrée si un filtre est posé — voir la note du composant. Le
  // `useState` ne sert que sur téléphone : au-dessus de 640px la CSS montre le
  // panneau quoi qu'il arrive, et le bouton disparaît.
  const [ouvert, setOuvert] = useState(filtreActif)

  return (
    <>
      {/* Un vrai formulaire : sans JavaScript, la touche Entrée soumet et la
          recherche fonctionne quand même. */}
      <form
        className="filtres filtres--empile"
        action="/enchainements"
        method="get"
        onSubmit={(evenement) => {
          evenement.preventDefault()
          if (minuterie.current) clearTimeout(minuterie.current)
          naviguer({ requete })
        }}
      >
        {/* LE PLI. Il n'existe QUE sur téléphone — la CSS le fait disparaître
            dès que la place revient. Le nombre de critères l'accompagne quand
            il y en a : replié, c'est la seule chose qui dise à l'écran pourquoi
            la liste est plus courte que d'habitude. */}
        <button
          type="button"
          className="filtres__bascule"
          aria-expanded={ouvert}
          aria-controls={idPanneau}
          onClick={() => setOuvert((etat) => !etat)}
        >
          <span className="filtres__bascule-intitule">Rechercher et filtrer</span>
          {nombreDeCriteres > 0 ? (
            <span className="filtres__bascule-compte label-caps">{nombreDeCriteres}</span>
          ) : null}
          <IconeChevron
            taille={18}
            className={`filtres__bascule-chevron${ouvert ? ' filtres__bascule-chevron--ouvert' : ''}`}
          />
        </button>

        <div
          id={idPanneau}
          className={`filtres__panneau${ouvert ? ' filtres__panneau--ouvert' : ''}`}
        >
          {/* DEUX LIGNES, ET PAS UNE (demande d'Alain, 2026-09-07). Le filtre par
            passe a fait le troisième champ étiqueté à côté de trois
            interrupteurs et d'un bouton : sept contrôles alignés, dont plus
            personne ne voyait la structure. Ils se lisent maintenant par
            nature — ce qu'on SAISIT en haut, ce qu'on BASCULE en dessous — et
            chaque champ y retrouve sa largeur. */}
          <div className="filtres__ligne">
            <div className="filtres__champ">
              <label className="filtres__label label-caps" htmlFor={idRecherche}>
                Rechercher un enchaînement
              </label>
              <input
                id={idRecherche}
                name="q"
                type="search"
                className="filtres__saisie"
                placeholder="Titre de l'enchaînement…"
                value={requete}
                onChange={(evenement) => saisir(evenement.target.value)}
              />
            </div>

            {/* Un auteur ne se propose que s'il y a QUELQU'UN A CHOISIR : sur un
              site ou tout vient d'Alain, un menu a une seule entree n'est qu'un
              clic pour rien. */}
            {auteurs.length > 1 ? (
              <div className="filtres__champ filtres__champ--court">
                <label className="filtres__label label-caps" htmlFor={idAuteur}>
                  Auteur
                </label>
                <select
                  id={idAuteur}
                  name="auteur"
                  className="filtres__saisie"
                  value={criteres.auteur === null ? '' : String(criteres.auteur)}
                  onChange={(evenement) =>
                    naviguer({
                      auteur: evenement.target.value === '' ? null : Number(evenement.target.value),
                    })
                  }
                >
                  <option value="">Tous</option>
                  {auteurs.map((auteur) => (
                    <option key={auteur.id} value={auteur.id}>
                      {auteur.nom}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {/* CONTIENT LA PASSE (2026-09-07). Il porte le « Voir les N
              enchaînements » de la fiche passe, mais il vaut aussi seul : c'est
              la question « où ai-je déjà dansé ça ? », posée depuis la liste.
              UN MENU DE 110 ENTREES, et c'est tenable : un `select` natif
              accepte la frappe (taper « tou » saute à Toupie) et devient un
              sélecteur plein écran sur téléphone. Un champ à complétion ferait
              mieux, mais au prix du repli sans JavaScript que tout ce
              formulaire préserve. */}
            <div className="filtres__champ filtres__champ--large">
              <label className="filtres__label label-caps" htmlFor={idPasse}>
                Contient la passe
              </label>
              <select
                id={idPasse}
                name="passe"
                className="filtres__saisie"
                value={criteres.passe === null ? '' : String(criteres.passe)}
                onChange={(evenement) =>
                  naviguer({
                    passe: evenement.target.value === '' ? null : Number(evenement.target.value),
                  })
                }
              >
                <option value="">Toutes</option>
                {passes.map((passe) => (
                  <option key={passe.id} value={passe.id}>
                    {passe.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* LES INTERRUPTEURS, et le retour à la liste entière. Ils partagent une
            ligne parce qu'ils se répondent : trois façons de restreindre, une
            de tout relâcher. */}
          <div className="filtres__ligne filtres__ligne--options">
            <div className="filtres__champ filtres__champ--case">
              <input
                id={idMusique}
                name="musique"
                value="1"
                type="checkbox"
                className="filtres__case"
                checked={cases.avecMusique}
                onChange={(evenement) => cocher('avecMusique', evenement.target.checked)}
              />
              <label className="filtres__label-case" htmlFor={idMusique}>
                Avec musique
              </label>
            </div>

            <div className="filtres__champ filtres__champ--case">
              <input
                id={idVideo}
                name="video"
                value="1"
                type="checkbox"
                className="filtres__case"
                checked={cases.avecVideo}
                onChange={(evenement) => cocher('avecVideo', evenement.target.checked)}
              />
              <label className="filtres__label-case" htmlFor={idVideo}>
                Avec vidéo
              </label>
            </div>

            {proposerFavoris ? (
              <div className="filtres__champ filtres__champ--case">
                <input
                  id={idFavoris}
                  name="favoris"
                  value="1"
                  type="checkbox"
                  className="filtres__case"
                  checked={cases.favorisSeuls}
                  onChange={(evenement) => cocher('favorisSeuls', evenement.target.checked)}
                />
                <label className="filtres__label-case" htmlFor={idFavoris}>
                  Mes favoris
                </label>
              </div>
            ) : null}

            {filtreActif ? (
              <Bouton variante="fantome" href="/enchainements" className="filtres__effacer">
                Tout afficher
              </Bouton>
            ) : null}
          </div>
        </div>
      </form>

      {/* Annonce le nombre de resultats aux lecteurs d'ecran. */}
      <p className="filtres__compte texte-attenue" role="status" aria-live="polite">
        {filtreActif ? `${total} enchaînement${total > 1 ? 's' : ''}` : ''}
      </p>
    </>
  )
}
