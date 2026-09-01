import { describe, expect, it } from 'vitest'

import {
  auMoinsUnCritere,
  conditions,
  lienListe,
  lireCriteres,
  versParametres,
} from '@/enchainements-liste'
import { numerosVisibles } from '@/components/Pagination'

/**
 * Les criteres de la liste, et la pagination (demande d'Alain, 2026-08-31).
 *
 * DEUX CHOSES SE TESTENT ICI, et aucune n'est cosmetique :
 *  - `lireCriteres` lit une URL, c'est-a-dire une saisie utilisateur. Une URL se
 *    bricole a la main, se tronque dans un message, se repete. Rien ne doit
 *    produire d'erreur, et surtout pas une page blanche ;
 *  - `conditions` traduit ces criteres en contrainte de requete. Une erreur ici
 *    ne se voit pas : elle donne une liste plausible mais fausse.
 */

describe('lireCriteres', () => {
  it('lit ce que porte l URL', () => {
    expect(lireCriteres({ q: ' chore ', page: '3', favoris: '1' })).toEqual({
      requete: 'chore',
      page: 3,
      favorisSeuls: true,
    })
  })

  it('retombe sur des valeurs saines quand l URL est absurde', () => {
    // Une URL bricolee a la main ne doit jamais faire tomber la page.
    expect(lireCriteres({}).page).toBe(1)
    expect(lireCriteres({ page: '0' }).page).toBe(1)
    expect(lireCriteres({ page: '-4' }).page).toBe(1)
    expect(lireCriteres({ page: 'deux' }).page).toBe(1)
    expect(lireCriteres({ favoris: 'oui' }).favorisSeuls).toBe(false)
  })

  it('prend la première valeur quand un paramètre est répété', () => {
    expect(lireCriteres({ page: ['2', '9'] }).page).toBe(2)
  })
})

describe('versParametres / lienListe', () => {
  it('omet les valeurs par défaut', () => {
    // Une URL propre se partage et se lit ; celle qui traine ses valeurs vides
    // ressemble a une fuite de code.
    expect(versParametres({ requete: '', page: 1, favorisSeuls: false }).toString()).toBe('')
    expect(lienListe({ requete: '', page: 1, favorisSeuls: false })).toBe('/enchainements')
  })

  it('garde les critères posés', () => {
    expect(lienListe({ requete: 'chore', page: 3, favorisSeuls: true })).toBe(
      '/enchainements?q=chore&favoris=1&page=3',
    )
  })

  it('fait l aller-retour avec lireCriteres', () => {
    const criteres = { requete: 'passe croisée', page: 4, favorisSeuls: true }
    const parametres = Object.fromEntries(versParametres(criteres))

    expect(lireCriteres(parametres)).toEqual(criteres)
  })
})

describe('conditions', () => {
  const vide = { requete: '', page: 1, favorisSeuls: false }

  it('ne contraint rien sans critère', () => {
    // `undefined` et non `{}` : la visibilite vient des `access` de la
    // collection, qu'on laisse decider seuls.
    expect(conditions(vide, [])).toBeUndefined()
    expect(auMoinsUnCritere(vide)).toBe(false)
  })

  it('cherche sur le titre NORMALISÉ, sans accent ni casse', () => {
    // Le point du test : sans normalisation, le `LIKE` de SQLite est accentue
    // et « Chorégraphie » echapperait a la recherche « chore ».
    expect(conditions({ ...vide, requete: 'Chorégraphie' }, [])).toEqual({
      titreNormalise: { like: 'choregraphie' },
    })
  })

  it('restreint aux favoris, et à RIEN quand il n y en a aucun', () => {
    expect(conditions({ ...vide, favorisSeuls: true }, [4, 9])).toEqual({ id: { in: [4, 9] } })
    // Sans favori, on veut une liste vide, pas la liste entiere : un `in: []`
    // veut dire l'un ou l'autre selon les bases.
    expect(conditions({ ...vide, favorisSeuls: true }, [])).toEqual({ id: { equals: 0 } })
  })

  it('combine les critères', () => {
    expect(conditions({ requete: 'chore', page: 2, favorisSeuls: true }, [4])).toEqual({
      and: [{ titreNormalise: { like: 'chore' } }, { id: { in: [4] } }],
    })
  })
})

describe('numerosVisibles', () => {
  it('ne montre rien tant qu il n y a qu une page', () => {
    expect(numerosVisibles(1, 1)).toEqual([1])
    expect(numerosVisibles(1, 0)).toEqual([])
  })

  it('montre tout quand tout tient', () => {
    expect(numerosVisibles(2, 4)).toEqual([1, 2, 3, 4])
  })

  it('coupe les longues séries autour de la page courante', () => {
    expect(numerosVisibles(10, 40)).toEqual([1, 'trou', 9, 10, 11, 'trou', 40])
  })

  it('affiche la page unique plutôt qu une ellipse qui la cacherait', () => {
    // Entre 1 et 3, l'ellipse ne masquerait que la page 2 : autant la montrer,
    // elle prend la meme place.
    expect(numerosVisibles(4, 6)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('reste juste aux extrémités', () => {
    expect(numerosVisibles(1, 40)).toEqual([1, 2, 'trou', 40])
    expect(numerosVisibles(40, 40)).toEqual([1, 'trou', 39, 40])
  })
})
