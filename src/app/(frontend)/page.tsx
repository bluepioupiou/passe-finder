import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import { Bouton } from '@/components/Bouton'
import { IconeEnchainement, IconePasse, IconePosition } from '@/components/Icones'
import { formaterDate } from '@/enchainements'
import { chargerNouveautes, LIBELLES, type TypeNouveaute } from '@/nouveautes'
import config from '@/payload.config'
import './accueil.css'

export const dynamic = 'force-dynamic'

/**
 * L'icone qui ouvre chaque ligne du fil (demande d'Alain, 2026-09-02).
 *
 * UN SEUL ENDROIT ou « type -> icone » est ecrit : le jour ou une quatrieme
 * nature d'objet entre dans le fil (une transition ?), TypeScript refusera de
 * compiler tant que la ligne manquera ici. Un `switch` avec un cas par defaut
 * l'aurait laissee passer sans icone.
 */
const ICONES: Record<TypeNouveaute, (p: { taille?: number }) => React.ReactElement> = {
  position: IconePosition,
  passe: IconePasse,
  enchainement: IconeEnchainement,
}

export const metadata = {
  title: 'Passe Finder',
  description:
    'Les dernieres positions, passes et enchainements ajoutes au catalogue de rock 6 temps.',
}

/**
 * Accueil (E1) — le fil des nouveautes.
 *
 * TROIS TYPES MELANGES DANS UNE SEULE LISTE, plus recents d'abord : ce qu'on
 * veut savoir en arrivant, c'est « quoi de neuf », pas « quoi de neuf dans les
 * positions ». Separer par type rendrait la question impossible a poser.
 *
 * L'ICONE PORTE LE TYPE, le mot le confirme. L'icone seule suffirait a
 * quelqu'un qui connait le site — elle ne suffit pas a un eleve qui arrive, et
 * l'accueil est justement l'ecran qu'on voit en premier. Le mot coute une
 * ligne discrete a cote de la date, et retire toute devinette (UX-DR17).
 *
 * LES BOUTONS RESTENT, SOUS LE FIL. Le fil montre dix elements ; il ne remplace
 * pas les portes d'entree vers les trois listes completes. Il les precede.
 */
export default async function HomePage() {
  const payload = await getPayload({ config: await config })
  const nouveautes = await chargerNouveautes(payload)

  return (
    <div className="contenu-page">
      {/* PAS DE « Bienvenue, <email> » : l'accueil est une page publique, et
          publier une adresse en h1 n'apprend rien a personne. Le compte
          connecte se lit dans la barre de navigation, ou il a sa place. */}
      <h1>Passe Finder</h1>
      <p className="texte-attenue accueil-intro">
        Le catalogue des positions et des passes de rock 6 temps, et les enchaînements du cours.
      </p>

      <div className="accueil-portes">
        <Bouton href="/enchainements">Voir les enchaînements</Bouton>
        <Bouton href="/positions" variante="fantome">
          Voir les positions
        </Bouton>
        <Bouton href="/passes" variante="fantome">
          Voir les passes
        </Bouton>
      </div>
      
      <section className="accueil-section" aria-labelledby="titre-nouveautes">
        <h2 id="titre-nouveautes" className="label-caps texte-attenue">
          Derniers ajouts
        </h2>

        {nouveautes.length === 0 ? (
          <p className="texte-attenue">Rien de neuf pour l’instant.</p>
        ) : (
          <ul className="accueil-fil">
            {nouveautes.map((nouveaute) => {
              const Icone = ICONES[nouveaute.type]
              const date = formaterDate(nouveaute.creeLe)

              return (
                <li key={`${nouveaute.type}-${nouveaute.id}`}>
                  <Link className="nouveaute" href={nouveaute.lien}>
                    <span className="nouveaute__icone">
                      <Icone taille={18} />
                    </span>
                    <span className="nouveaute__texte">
                      <span className="nouveaute__titre">{nouveaute.titre}</span>
                      <span className="nouveaute__meta texte-attenue">
                        {LIBELLES[nouveaute.type]}
                        {date ? ` · ${date}` : null}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      
    </div>
  )
}
