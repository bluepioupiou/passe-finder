import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AtelierPosition } from '@/components/AtelierPosition'
import {
  angleDEpaule,
  type PieceBras,
  type PieceTete,
  type ResultatPosition,
  type SaisiePosition,
} from '@/schema-position'

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

/** Une ligne de la pile, choisie par son libelle. */
const rang = (motif: RegExp) =>
  rangs().find((ligne) => motif.test(ligne.textContent ?? ''))!

/** Le bouton de SELECTION d'une ligne — pas ses fleches, qui portent le meme
 *  nom de piece dans leur `aria-label`. */
const choisir = (motif: RegExp) =>
  fireEvent.click(within(rang(motif)).getByRole('button', { name: new RegExp(`^${motif.source}`) }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('la scène de départ', () => {
  it('pose d’emblée un couple complet, quatre bras compris', () => {
    // Le geste economise : toutes les positions du catalogue ont cette
    // distribution, la reconstruire a la main serait cinq clics a chaque fois.
    monter()
    expect(rangs()).toHaveLength(6)
  })

  it('nomme chaque bras par son épaule et son danseur', () => {
    monter()
    const libelles = rangs().map((ligne) => ligne.textContent ?? '')

    expect(libelles.some((l) => /Bras gauche du cavalier/.test(l))).toBe(true)
    expect(libelles.some((l) => /Bras droit du cavalier/.test(l))).toBe(true)
    expect(libelles.some((l) => /Bras gauche de la cavalière/.test(l))).toBe(true)
    expect(libelles.some((l) => /Bras droit de la cavalière/.test(l))).toBe(true)
  })

  it('range les bras SOUS les têtes, du dessus vers le dessous', () => {
    // La pile se lit du dessus vers le dessous : les tetes viennent donc en
    // premier, sans quoi le depart des bras — trace sous la tete — serait visible.
    monter()
    const libelles = rangs().map((ligne) => ligne.textContent ?? '')
    expect(libelles[0]).toMatch(/Cavalière/)
    expect(libelles[1]).toMatch(/Cavalier/)
    expect(libelles.slice(2).every((l) => /Bras/.test(l))).toBe(true)
  })
})

describe('les bras suivent leur tête', () => {
  it('emporte les bras quand la tête pivote', () => {
    // Le coeur de la demande. Chaque bras garde son ecart a l'epaule, donc un
    // reglage manuel n'est pas perdu — c'est l'ECART qui est reporte.
    const enregistrer = monter()
    choisir(/Cavalier ·/)
    fireEvent.click(screen.getByRole('button', { name: 'Tourner vers la droite' }))

    fireEvent.change(screen.getByLabelText('Nom de la position'), { target: { value: 'X' } })
    fireEvent.submit(screen.getByRole('button', { name: /Créer la position/ }).closest('form')!)

    const schema = enregistrer.mock.calls[0][0].schema
    const cavalier = schema.pieces.find((p) => p.type === 'tete' && p.genre === 'cavalier')!
    const sesBras = schema.pieces.filter(
      (p): p is PieceBras => p.type === 'bras' && p.tete === cavalier.id,
    )

    // La tete nait a 0 et prend 30 : ses deux bras ont pris les memes 30.
    expect(cavalier.rotation).toBe(30)
    expect(sesBras.map((b) => b.rotation).sort()).toEqual([120, 300])
  })

  it('emporte les bras quand la tête se déplace au clavier', () => {
    const enregistrer = monter()
    choisir(/Cavalière ·/)

    const { container } = render(<div />)
    void container
    fireEvent.keyDown(document.querySelector('.atelier')!, { key: 'ArrowUp' })

    fireEvent.change(screen.getByLabelText('Nom de la position'), { target: { value: 'X' } })
    fireEvent.submit(screen.getByRole('button', { name: /Créer la position/ }).closest('form')!)

    const schema = enregistrer.mock.calls[0][0].schema
    const cavaliere = schema.pieces.find((p) => p.type === 'tete' && p.genre === 'cavaliere')!
    const sesBras = schema.pieces.filter(
      (p): p is PieceBras => p.type === 'bras' && p.tete === cavaliere.id,
    )

    // Le bras reste EXACTEMENT sur le centre de sa tete : c'est ce qui fait
    // qu'il s'y emboite sans reglage.
    expect(sesBras.every((b) => b.x === cavaliere.x && b.y === cavaliere.y)).toBe(true)
    expect(cavaliere.y).toBe(-10)
  })

  it('retire les bras avec le danseur qu’on supprime', () => {
    monter()
    fireEvent.click(within(rang(/Cavalier ·/)).getByRole('button', { name: /Supprimer/ }))

    // Il ne reste que la cavaliere et ses deux bras.
    expect(rangs()).toHaveLength(3)
    expect(rangs().every((l) => !/du cavalier/.test(l.textContent ?? ''))).toBe(true)
  })
})

describe('régler une pièce', () => {
  it('ouvre les réglages quand on clique une ligne de la pile', () => {
    monter()
    choisir(/Bras gauche du cavalier/)

    expect(screen.getByRole('heading', { name: /Régler .*Bras gauche du cavalier/ })).toBeTruthy()
    expect(screen.getByLabelText(/Longueur/)).toBeTruthy()
    expect(screen.getByLabelText(/Ellipse/)).toBeTruthy()
  })

  it('ne propose plus le noir et le gris sur un bras rattaché', () => {
    // La couleur vient du danseur : la proposer serait proposer de mentir.
    monter()
    choisir(/Bras droit de la cavalière/)

    expect(screen.queryByRole('button', { name: /Gris \(en dessous\)/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Remettre sur l’épaule/ })).toBeTruthy()
  })

  it('remet un bras à l’angle de son épaule', () => {
    const enregistrer = monter()
    choisir(/Bras gauche du cavalier/)

    const droite = screen.getByRole('button', { name: 'Tourner vers la droite' })
    fireEvent.click(droite)
    fireEvent.click(droite)
    fireEvent.click(screen.getByRole('button', { name: /Remettre sur l’épaule/ }))

    fireEvent.change(screen.getByLabelText('Nom de la position'), { target: { value: 'X' } })
    fireEvent.submit(screen.getByRole('button', { name: /Créer la position/ }).closest('form')!)

    const schema = enregistrer.mock.calls[0][0].schema
    const cavalier = schema.pieces.find(
      (p): p is PieceTete => p.type === 'tete' && p.genre === 'cavalier',
    )!
    const gauche = schema.pieces.find(
      (p): p is PieceBras => p.type === 'bras' && p.tete === cavalier.id && p.cote === 'gauche',
    )!

    // On relit la regle plutot que de la recopier : le test verifie le
    // CABLAGE du bouton, pas la trigonometrie, deja couverte a part.
    expect(gauche.rotation).toBe(angleDEpaule(cavalier, 'gauche'))
  })

  it('allonge un bras avec le curseur', () => {
    const enregistrer = monter()
    choisir(/Bras gauche du cavalier/)
    fireEvent.change(screen.getByLabelText(/Longueur/), { target: { value: '400' } })

    fireEvent.change(screen.getByLabelText('Nom de la position'), { target: { value: 'X' } })
    fireEvent.submit(screen.getByRole('button', { name: /Créer la position/ }).closest('form')!)

    const bras = enregistrer.mock.calls[0][0].schema.pieces.filter(
      (p): p is PieceBras => p.type === 'bras',
    )
    expect(bras.some((b) => b.longueur === 400)).toBe(true)
  })
})

describe('ajouter et réordonner', () => {
  it('rattache un bras ajouté à la tête choisie', () => {
    const enregistrer = monter()
    choisir(/Cavalière ·/)
    fireEvent.click(screen.getByRole('button', { name: 'Bras gauche' }))

    expect(rangs()).toHaveLength(7)
    expect(annonce().textContent).toContain('Bras gauche de la cavalière')

    fireEvent.change(screen.getByLabelText('Nom de la position'), { target: { value: 'X' } })
    fireEvent.submit(screen.getByRole('button', { name: /Créer la position/ }).closest('form')!)

    const schema = enregistrer.mock.calls[0][0].schema
    const cavaliere = schema.pieces.find((p) => p.type === 'tete' && p.genre === 'cavaliere')!
    const sesBras = schema.pieces.filter((p) => p.type === 'bras' && p.tete === cavaliere.id)
    expect(sesBras).toHaveLength(3)
  })

  it('repart du couple par défaut', () => {
    monter()
    fireEvent.click(within(rang(/Cavalier ·/)).getByRole('button', { name: /Supprimer/ }))
    expect(rangs()).toHaveLength(3)

    fireEvent.click(screen.getByRole('button', { name: /Repartir du couple par défaut/ }))
    expect(rangs()).toHaveLength(6)
  })

  it('monte et descend une pièce d’un rang', () => {
    monter()
    fireEvent.click(within(rangs()[0]).getByRole('button', { name: /Descendre/ }))
    expect(annonce().textContent).toContain('descendu')
  })

  it('grise les flèches aux extrémités, au lieu de perdre la pièce', () => {
    monter()
    expect(within(rangs()[0]).getByRole('button', { name: /Monter/ })).toHaveProperty(
      'disabled',
      true,
    )
    expect(within(rangs()[5]).getByRole('button', { name: /Descendre/ })).toHaveProperty(
      'disabled',
      true,
    )
  })
})

describe('enregistrement', () => {
  it('envoie EXACTEMENT le schéma affiché', async () => {
    const enregistrer = monter()
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
    expect(saisie.schema.pieces).toHaveLength(6)

    await vi.waitFor(() => expect(pousser).toHaveBeenCalledWith('/positions/42'))
  })

  it('affiche l’échec SANS vider le canevas', async () => {
    const enregistrer = vi.fn<Action>(async () => ({ ok: false, message: 'Session expirée.' }))
    monter(enregistrer)
    fireEvent.change(screen.getByLabelText('Nom de la position'), { target: { value: 'Fermée' } })

    fireEvent.submit(screen.getByRole('button', { name: /Créer la position/ }).closest('form')!)

    // Tout le travail est encore la : c'est la seule chose qui compte quand
    // l'enregistrement echoue.
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Session expirée.')
    expect(rangs()).toHaveLength(6)
    expect(screen.getByLabelText('Nom de la position')).toHaveProperty('value', 'Fermée')
    expect(pousser).not.toHaveBeenCalled()
  })

  it('rouvre une composition existante SANS y injecter le couple par défaut', () => {
    // Le scenario destructeur a eviter : un schema relu ne doit surtout pas se
    // voir ajouter des pieces qu'il n'avait pas.
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
    expect(screen.getByLabelText(/Ancienne image en calque/)).toBeTruthy()
  })
})
