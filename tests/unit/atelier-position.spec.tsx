import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AtelierPosition } from '@/components/AtelierPosition'
import type { ResultatPosition, SaisiePosition } from '@/schema-position'

/**
 * L'atelier — le CABLAGE, vu depuis les clics.
 *
 * POURQUOI CE TEST EXISTE ALORS QUE LES REGLES SONT DEJA COUVERTES.
 * `schema-position.ts` et `dessin-position.ts` sont des fonctions pures,
 * eprouvees a part. Ce qu'elles ne garantissent pas, c'est ce que chaque bouton
 * declenche, ce que la pile affiche ensuite, et ce que l'enregistrement envoie
 * vraiment. C'est la couche ou ce genre d'ecran se casse.
 *
 * CE QUE CE NIVEAU NE PEUT PAS COUVRIR, ET IL FAUT LE SAVOIR : jsdom ne met
 * rien en page. `getBoundingClientRect()` y renvoie des zeros et
 * `setPointerCapture` n'existe pas — le GLISSER n'y est donc pas eprouvable.
 * Il appartient a `tests/e2e/atelier-position.e2e.spec.ts`, seul niveau ou de
 * vrais evenements de pointeur touchent une page reellement mise en page. C'est
 * aussi pour cela que l'arithmetique du glisser est extraite dans
 * `pointVersToile`, testee sans DOM.
 */

// L'atelier navigue vers la fiche apres enregistrement : hors navigateur Next,
// `useRouter` doit etre double, sinon le composant ne monte meme pas.
const pousser = vi.fn()
const rafraichir = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pousser, refresh: rafraichir }),
}))

/** Le type de l'action, ecrit ici pour que la doublure porte SA SIGNATURE :
 *  sans lui, `mock.calls[0][0]` serait typé `undefined` et l'assertion la plus
 *  importante du fichier — ce qui est reellement envoye — ne compilerait pas. */
type Action = (saisie: SaisiePosition) => Promise<ResultatPosition>

const succes: Action = async () => ({ ok: true, id: 42 })

function monter(enregistrer = vi.fn<Action>(succes)) {
  render(<AtelierPosition enregistrer={enregistrer} retour="/positions" />)
  return enregistrer
}

const pile = () => screen.getByRole('list')
const rangs = () => within(pile()).getAllByRole('listitem')
const annonce = () => screen.getByRole('status')

const ajouter = (nom: string) => fireEvent.click(screen.getByRole('button', { name: nom }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ajouter des pièces', () => {
  it('pose une tête et la fait apparaître dans la pile', () => {
    monter()
    expect(screen.getByText(/Aucune pièce/)).toBeTruthy()

    ajouter('Cavalier')

    expect(rangs()).toHaveLength(1)
    expect(within(pile()).getByText(/Cavalier/)).toBeTruthy()
    expect(annonce().textContent).toContain('ajouté')
  })

  it('range les bras SOUS les têtes, sans qu on ait a les redescendre', () => {
    // Sans cette regle, le depart du bras — volontairement trace sous la tete —
    // deviendrait visible, et le premier geste serait toujours le meme.
    monter()
    ajouter('Cavalier')
    ajouter('Bras noir')

    // La pile se lit du DESSUS vers le dessous : la tete est donc en premier.
    const [premier, second] = rangs()
    expect(premier.textContent).toContain('Cavalier')
    expect(second.textContent).toContain('Bras noir')
  })
})

describe('la pièce choisie', () => {
  it('ouvre les réglages quand on clique une ligne de la pile', () => {
    monter()
    ajouter('Cavalière')
    ajouter('Bras noir')

    // Le bras vient d'etre ajoute, donc selectionne : on choisit l'autre.
    // Le bouton de SELECTION, et non les fleches du rang : elles portent le
    // meme nom de piece dans leur `aria-label`.
    fireEvent.click(within(rangs()[0]).getByRole('button', { name: /^Cavalière ·/ }))

    expect(screen.getByRole('heading', { name: /Régler .*Cavalière/ })).toBeTruthy()
    // Une tete n'a ni longueur ni courbure : les curseurs ne doivent pas etre la.
    expect(screen.queryByLabelText(/Longueur/)).toBeNull()
  })

  it('tourne par pas de 30 degrés et l’annonce', () => {
    monter()
    ajouter('Cavalier')

    const droite = screen.getByRole('button', { name: 'Tourner vers la droite' })
    fireEvent.click(droite)
    fireEvent.click(droite)

    // Le cavalier nait a 180 : deux pas de 30 le mettent a 240.
    expect(annonce().textContent).toContain('240 degrés')
  })

  it('déplace la pièce AU CLAVIER, sans souris', () => {
    const { container } = render(
      <AtelierPosition enregistrer={vi.fn(succes)} retour="/positions" />,
    )
    ajouter('Cavalier')

    fireEvent.keyDown(container.querySelector('.atelier')!, { key: 'ArrowRight' })

    expect(annonce().textContent).toMatch(/déplacé, x -\d+/)
  })

  it('bascule un bras du noir au gris', () => {
    monter()
    ajouter('Bras noir')

    fireEvent.click(screen.getByRole('button', { name: 'Gris (en dessous)' }))

    expect(within(pile()).getByText(/Bras gris/)).toBeTruthy()
    expect(annonce().textContent).toContain('Bras gris')
  })

  it('allonge un bras avec le curseur', () => {
    monter()
    ajouter('Bras noir')

    fireEvent.change(screen.getByLabelText(/Longueur/), { target: { value: '400' } })

    expect(within(pile()).getByText(/long/)).toBeTruthy()
  })
})

describe('l’ordre de superposition', () => {
  it('monte et descend une pièce d’un rang', () => {
    monter()
    ajouter('Cavalier')
    ajouter('Cavalière')

    // La cavaliere est en haut de la pile ; on la descend.
    fireEvent.click(within(rangs()[0]).getByRole('button', { name: /Descendre/ }))

    expect(rangs()[0].textContent).toContain('Cavalier ')
    expect(annonce().textContent).toContain('descendu')
  })

  it('grise les flèches aux extrémités, au lieu de perdre la pièce', () => {
    monter()
    ajouter('Cavalier')
    ajouter('Cavalière')

    expect(within(rangs()[0]).getByRole('button', { name: /Monter/ })).toHaveProperty('disabled', true)
    expect(within(rangs()[1]).getByRole('button', { name: /Descendre/ })).toHaveProperty(
      'disabled',
      true,
    )
  })

  it('supprime une pièce', () => {
    monter()
    ajouter('Cavalier')
    fireEvent.click(within(rangs()[0]).getByRole('button', { name: /Supprimer/ }))

    expect(screen.getByText(/Aucune pièce/)).toBeTruthy()
  })
})

describe('enregistrement', () => {
  it('refuse d’enregistrer un schéma vide', () => {
    monter()
    expect(screen.getByRole('button', { name: /Créer la position/ })).toHaveProperty(
      'disabled',
      true,
    )
  })

  it('envoie EXACTEMENT le schéma affiché', async () => {
    const enregistrer = monter()
    ajouter('Cavalier')
    ajouter('Bras gris')
    fireEvent.change(screen.getByLabelText('Nom de la position'), {
      target: { value: '  Bras dessus bras dessous  ' },
    })

    fireEvent.submit(screen.getByRole('button', { name: /Créer la position/ }).closest('form')!)
    await vi.waitFor(() => expect(enregistrer).toHaveBeenCalledTimes(1))

    const saisie = enregistrer.mock.calls[0][0]
    expect(saisie.id).toBeNull()
    // Le nom part tel quel : c'est l'action serveur qui taille les espaces, une
    // seule fois, la ou la regle compte.
    expect(saisie.nom).toBe('  Bras dessus bras dessous  ')
    expect(saisie.schema.pieces).toHaveLength(2)
    expect(saisie.schema.pieces[0].type).toBe('bras')
    expect(saisie.schema.pieces[1].type).toBe('tete')

    await vi.waitFor(() => expect(pousser).toHaveBeenCalledWith('/positions/42'))
  })

  it('affiche l’échec SANS vider le canevas', async () => {
    const enregistrer = vi.fn<Action>(async () => ({ ok: false, message: 'Session expirée.' }))
    monter(enregistrer)
    ajouter('Cavalier')
    fireEvent.change(screen.getByLabelText('Nom de la position'), { target: { value: 'Fermée' } })

    fireEvent.submit(screen.getByRole('button', { name: /Créer la position/ }).closest('form')!)

    // Tout le travail est encore la : c'est la seule chose qui compte quand
    // l'enregistrement echoue.
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Session expirée.')
    expect(rangs()).toHaveLength(1)
    expect(screen.getByLabelText('Nom de la position')).toHaveProperty('value', 'Fermée')
    expect(pousser).not.toHaveBeenCalled()
  })

  it('rouvre une composition existante et propose de l’enregistrer', () => {
    const enregistrer = vi.fn<Action>(succes)
    render(
      <AtelierPosition
        enregistrer={enregistrer}
        retour="/positions/7"
        initial={{
          id: 7,
          schema: {
            version: 1,
            taille: 640,
            calque: { src: '/api/media/file/vieille.jpg' },
            pieces: [{ id: 'a', type: 'tete', genre: 'cavaliere', x: 0, y: 0, rotation: 90 }],
          },
          informations: { nom: 'Berceau', description: 'Une prise' },
        }}
      />,
    )

    expect(rangs()).toHaveLength(1)
    expect(screen.getByLabelText('Nom de la position')).toHaveProperty('value', 'Berceau')
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeTruthy()
    // Le calque n'apparait que lorsqu'il y en a un : son curseur en est la preuve.
    expect(screen.getByLabelText(/Ancienne image en calque/)).toBeTruthy()
  })
})
