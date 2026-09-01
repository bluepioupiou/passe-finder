import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Compositeur } from '@/components/Compositeur'
import type {
  ResultatEnregistrement,
  SaisieEnchainement,
  VuePasse,
  VuePosition,
  VueTransition,
} from '@/composition'

/**
 * Compositeur — le changement de prise, vu depuis les clics (Story 4.7).
 *
 * POURQUOI CE TEST EXISTE ALORS QUE LE MOTEUR EST DEJA COUVERT. `transitionsUtiles`
 * et `positionCourante` sont des fonctions pures, testees a part ; ce qui n'est
 * pas garanti par elles, c'est le CABLAGE — quel etat le clic change, ce que la
 * liste des passes affiche ensuite, dans quel ordre l'annulation defait les
 * choses, et ce que l'enregistrement envoie vraiment. C'est precisement la
 * couche ou une story de composition se casse, et c'est la seule qu'on ne peut
 * pas verifier a la main sans se connecter en administrateur.
 *
 * Le graphe d'essai est minuscule et volontairement facon « rock » :
 *
 *   fermee --Sortie cavaliere--> MG/MD --Prise en berceau--> berceau (cul-de-sac)
 *   MD/MD  --Changement de cote--> fermee
 *   transitions : MG/MD -> MD/MD   (lacher la main gauche)
 *                 berceau -> MG/MD (la seule sortie du cul-de-sac)
 */

// Le compositeur navigue vers la fiche apres enregistrement : hors navigateur
// Next, `useRouter` doit etre double, sinon le composant ne monte meme pas.
const pousser = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pousser }) }))

function position(id: number, nom: string): VuePosition {
  return { id, nom, src: '/no_position.jpg' }
}

function passe(id: number, nom: string, debut: number, fin: number): VuePasse {
  return { id, nom, difficulte: null, debut, fin }
}

const FERMEE = 1
const MG_MD = 2
const MD_MD = 3
const BERCEAU = 4

const positions = [
  position(FERMEE, 'Position fermée'),
  position(MG_MD, 'Main gauche / main droite'),
  position(MD_MD, 'Main droite / main droite'),
  position(BERCEAU, 'Berceau gauche'),
]

const passes = [
  passe(10, 'Sortie cavalière', FERMEE, MG_MD),
  passe(11, 'Prise en berceau gauche', MG_MD, BERCEAU),
  passe(12, 'Changement de côté changement de main', MD_MD, FERMEE),
]

const transitions: VueTransition[] = [
  {
    debut: MG_MD,
    fin: MD_MD,
    nom: 'Lâcher la main gauche',
    description: 'Il vous suffit juste de lâcher votre main gauche',
  },
  { debut: BERCEAU, fin: MG_MD, nom: 'Reprendre la main', description: null },
]

/** Monte le compositeur et retient ce que l'enregistrement recoit. */
function monter() {
  const appels: SaisieEnchainement[] = []
  const action = async (saisie: SaisieEnchainement): Promise<ResultatEnregistrement> => {
    appels.push(saisie)
    return { ok: true, idPublic: 'AAAAAAAAAAAA' }
  }

  render(
    <Compositeur
      positions={positions}
      passes={passes}
      transitions={transitions}
      dateParDefaut="2026-09-01"
      visibilites={[
        { label: 'Privé', value: 'prive' },
        { label: 'Non répertorié', value: 'nonRepertorie' },
        { label: 'Public', value: 'public' },
      ]}
      enregistrer={action}
    />,
  )

  return { appels }
}

/** Une section du compositeur, designee par son titre. */
function section(titre: RegExp): HTMLElement | null {
  const entete = screen.queryByRole('heading', { name: titre })
  return entete ? (entete.closest('section') as HTMLElement) : null
}

/** La section « Passes possibles », dont on lit les propositions. */
function sectionPasses(): HTMLElement {
  return section(/Passes possibles/) as HTMLElement
}

/** La section « Changer de prise », ou `null` si elle n'est pas affichee. */
function sectionPrise(): HTMLElement | null {
  return section(/Changer de prise/)
}

/** Clique un bouton nomme, dans une section donnee. */
function cliquer(zone: HTMLElement, nom: RegExp) {
  fireEvent.click(within(zone).getByRole('button', { name: nom }))
}

/** Choisit la position de depart, puis pose les passes nommees, dans l'ordre. */
function composer(depart: string, ...noms: string[]) {
  // Le compositeur porte DEUX listes deroulantes (depart et visibilite) : on
  // vise celle de la premiere section, pas la premiere venue.
  const select = within(section(/Position de départ/) as HTMLElement).getByRole('combobox')
  const option = within(select).getByRole('option', { name: depart }) as HTMLOptionElement
  fireEvent.change(select, { target: { value: option.value } })

  for (const nom of noms) cliquer(sectionPasses(), new RegExp(nom))
}

afterEach(() => {
  cleanup()
  pousser.mockClear()
})

describe('Compositeur — changer de prise', () => {
  it('propose le changement de prise depuis l arrivee de la derniere passe', async () => {
    monter()
    composer('Position fermée', 'Sortie cavalière')

    // On est en « main gauche / main droite » : la transition declaree depuis
    // cette position doit apparaitre, avec son texte de prof.
    const prise = sectionPrise() as HTMLElement
    expect(prise).not.toBeNull()
    expect(within(prise).getByText('Lâcher la main gauche')).toBeTruthy()
    expect(within(prise).getByText('Il vous suffit juste de lâcher votre main gauche')).toBeTruthy()
  })

  it('deplace la position courante et rouvre la liste des passes', async () => {
    monter()
    composer('Position fermée', 'Sortie cavalière')

    // Avant : depuis MG/MD, une seule passe part.
    expect(
      within(sectionPasses()).getByRole('button', { name: /Prise en berceau gauche/ }),
    ).toBeTruthy()

    cliquer(sectionPrise() as HTMLElement, /Lâcher la main gauche/)

    // Apres : la liste est celle de MD/MD, la position vers laquelle on a
    // change de prise. C'est tout l'interet du mecanisme.
    expect(
      within(sectionPasses()).getByRole('button', {
        name: /Changement de côté changement de main/,
      }),
    ).toBeTruthy()
    expect(
      within(sectionPasses()).queryByRole('button', { name: /Prise en berceau gauche/ }),
    ).toBeNull()
  })

  it('offre une sortie depuis un cul-de-sac', async () => {
    monter()
    composer('Position fermée', 'Sortie cavalière', 'Prise en berceau gauche')

    // « Berceau gauche » n'a aucune passe sortante : sans transition, la
    // composition s'arreterait la. C'est le cas reel de l'historique.
    expect(within(sectionPasses()).getByText(/Aucune passe ne part d/)).toBeTruthy()

    cliquer(sectionPrise() as HTMLElement, /Reprendre la main/)

    expect(
      within(sectionPasses()).getByRole('button', { name: /Prise en berceau gauche/ }),
    ).toBeTruthy()
  })

  it('n enchaine pas deux changements de prise : la liste reste ancree sur la derniere passe', async () => {
    monter()
    composer('Position fermée', 'Sortie cavalière')
    cliquer(sectionPrise() as HTMLElement, /Lâcher la main gauche/)

    // Toujours la transition DEPUIS MG/MD (l'arrivee de la derniere passe), et
    // pas les transitions depuis MD/MD : on peut changer d'avis, pas se
    // deplacer librement de proche en proche dans le graphe.
    const prise = sectionPrise() as HTMLElement
    expect(within(prise).getByRole('button', { name: /Lâcher la main gauche/ })).toBeTruthy()
    expect(within(prise).queryByRole('button', { name: /Reprendre la main/ })).toBeNull()
  })

  it('defait le changement de prise avant la passe', async () => {
    monter()
    composer('Position fermée', 'Sortie cavalière')
    cliquer(sectionPrise() as HTMLElement, /Lâcher la main gauche/)

    // Premiere annulation : le changement de prise seul. La passe reste posee,
    // donc la liste redevient celle de MG/MD.
    fireEvent.click(screen.getByRole('button', { name: /Annuler « Lâcher la main gauche »/ }))
    expect(
      within(sectionPasses()).getByRole('button', { name: /Prise en berceau gauche/ }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: /Retirer « Sortie cavalière »/ })).toBeTruthy()
  })

  it('remet le changement de prise en attente quand on retire la passe qui le suivait', async () => {
    monter()
    composer('Position fermée', 'Sortie cavalière')
    cliquer(sectionPrise() as HTMLElement, /Lâcher la main gauche/)
    cliquer(sectionPasses(), /Changement de côté changement de main/)

    // On retire la passe : sans cette regle, on perdrait au passage un choix
    // qu'on n'avait pas demande a defaire, et il faudrait le refaire pour
    // essayer une autre passe depuis la meme prise.
    fireEvent.click(
      screen.getByRole('button', { name: /Retirer « Changement de côté changement de main »/ }),
    )

    expect(screen.getByRole('button', { name: /Annuler « Lâcher la main gauche »/ })).toBeTruthy()
    expect(
      within(sectionPasses()).getByRole('button', {
        name: /Changement de côté changement de main/,
      }),
    ).toBeTruthy()
  })

  it('refuse d enregistrer un changement de prise que rien ne suit', async () => {
    monter()
    composer('Position fermée', 'Sortie cavalière')
    cliquer(sectionPrise() as HTMLElement, /Lâcher la main gauche/)

    // Seules les passes sont stockees : un changement en fin de chaine n'aurait
    // rien pour survivre. On le dit, plutot que de le perdre en silence.
    const enregistrer = screen.getByRole('button', { name: /Enregistrer l/ }) as HTMLButtonElement
    expect(enregistrer.disabled).toBe(true)
    expect(screen.getByText(/Termine le changement de prise/)).toBeTruthy()
  })

  it('n envoie que les passes a l enregistrement', async () => {
    const { appels } = monter()
    composer('Position fermée', 'Sortie cavalière')
    cliquer(sectionPrise() as HTMLElement, /Lâcher la main gauche/)
    cliquer(sectionPasses(), /Changement de côté changement de main/)

    // « Titre » nomme deux champs (l'enchainement et la musique) : le premier.
    fireEvent.change(screen.getAllByLabelText('Titre')[0], { target: { value: 'Essai' } })
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer l/ }))

    await vi.waitFor(() => expect(appels.length).toBe(1))

    // La reprise n'est PAS un maillon : elle se rededuit du couple (arrivee,
    // depart suivant) a la lecture. Rien a stocker.
    expect(appels[0].passes).toEqual([10, 12])
  })
})
