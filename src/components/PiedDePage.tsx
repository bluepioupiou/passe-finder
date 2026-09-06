import Link from 'next/link'
import React from 'react'

import './pied-de-page.css'

/** L'adresse de contact du site, créée par Alain pour ça. */
export const COURRIEL_CONTACT = 'passe-finder@gmail.com'

/**
 * Pied de page du site public (UX-DR4).
 *
 * Trois choses seulement : qui a fait le site, comment le joindre, et où on
 * explique à quoi il sert. C'est un site tenu par UNE personne pour ses élèves —
 * la signature et l'adresse disent exactement cela, et il n'y a rien d'autre à
 * y mettre (pas de plan de site : la barre de navigation porte déjà les trois
 * entrées du catalogue).
 *
 * POURQUOI « COMMENT ÇA MARCHE ? » EST ICI ET PAS DANS LA NAVIGATION (décision
 * d'Alain) : la barre du haut est déjà chargée, et cette page se lit une fois.
 * Sa seconde porte est une phrase dans l'introduction de l'accueil, qui ne
 * coûte pas non plus d'entrée de menu.
 *
 * Composant SERVEUR, sans état ni interaction : un `mailto:` est un lien, pas
 * un formulaire. Il ouvre le client de messagerie du lecteur, ne demande aucun
 * traitement côté site, et continue de marcher sans JavaScript.
 *
 * Le SUJET est pré-rempli : les messages arrivent dans une boîte Gmail
 * ordinaire, et « Passe Finder » en objet suffit à les retrouver au milieu du
 * reste. Le lecteur reste libre de le remplacer.
 */
export function PiedDePage() {
  return (
    <footer className="pied">
      <div className="pied__contenu">
        <p>
          Site réalisé avec{' '}
          {/* L'emoji EST un mot dans cette phrase : sans intitulé, un lecteur
              d'écran lirait « site réalisé avec par bluepioupiou ». */}
          <span className="pied__coeur" role="img" aria-label="amour">
            ❤️
          </span>{' '}
          par bluepioupiou.
        </p>

        <p>
          Des questions, des commentaires, des besoins :{' '}
          <a href={`mailto:${COURRIEL_CONTACT}?subject=Passe%20Finder`}>écrivez-moi ici</a>.
        </p>

        <p>
          <Link href="/comment-ca-marche">Comment ça marche ?</Link>
        </p>
      </div>
    </footer>
  )
}
