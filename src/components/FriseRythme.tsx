import React from 'react'

import type { InstantDeFrise } from '@/positions-intermediaires'
import { ScenePosition } from './ScenePosition'
import './frise-rythme.css'

/**
 * La passe sur son rythme (Story 8.3, FR-49) : le depart, chaque position
 * intermediaire a son instant, puis l'arrivee.
 *
 * DEUX LECTURES, UN SEUL BALISAGE. Sur grand ecran, une frise horizontale qui
 * montre TOUS les instants : un instant vide garde sa place et son mot du
 * comptage, c'est ce qui rend le rythme visible. Sur telephone, douze ou vingt
 * instants ne tiennent pas en largeur : la piste devient une colonne qui ne
 * garde que les instants occupes, et la ligne du comptage complet, en tete,
 * garde le repere du rythme (instants occupes a l'accent).
 *
 * Les positions intermediaires sont dessinees depuis leur schema, sans angle :
 * elles sont dans le repere du depart (AD-16). Elles n'ont pas de fiche, donc
 * pas de lien. Le depart et l'arrivee, eux, arrivent tout faits de la page —
 * cliquables, et l'arrivee orientee comme en Epic 7.
 */
export function FriseRythme({
  depart,
  arrivee,
  instants,
}: {
  depart: React.ReactNode
  arrivee: React.ReactNode
  instants: InstantDeFrise[]
}) {
  return (
    <section className="frise-rythme" aria-label="La passe sur son rythme">
      <p className="frise-rythme__comptage" aria-hidden="true">
        {instants.map(({ instant, temps, schema }) => (
          <span
            key={instant}
            className={schema ? 'frise-rythme__mot frise-rythme__mot--occupe' : 'frise-rythme__mot'}
          >
            {temps}
          </span>
        ))}
      </p>

      <ol className="frise-rythme__piste">
        <li className="frise-rythme__extremite">{depart}</li>

        {instants.map(({ instant, temps, nom, schema }) =>
          schema ? (
            <li key={instant} className="frise-rythme__instant frise-rythme__instant--occupe">
              <ScenePosition
                className="frise-rythme__vignette"
                schema={schema}
                titre={`Position à l’instant ${nom}`}
              />
              {/* Le mot sur la frise, le nom complet dans la colonne du
                  telephone : « et » seul n'y dirait plus rien. */}
              <span className="frise-rythme__temps" aria-hidden="true">
                {temps}
              </span>
              <span className="frise-rythme__nom" aria-hidden="true">
                {nom}
              </span>
            </li>
          ) : (
            // Un instant vide ne porte que le rythme : rien a annoncer.
            <li key={instant} className="frise-rythme__instant" aria-hidden="true">
              <span className="frise-rythme__temps">{temps}</span>
            </li>
          ),
        )}

        <li className="frise-rythme__extremite">{arrivee}</li>
      </ol>
    </section>
  )
}
