import { describe, expect, it } from 'vitest'

import { fournisseurDe, presenterMusique } from '@/musique'

/**
 * La musique d'un enchainement (demande d'Alain, 2026-08-31).
 *
 * `presenterMusique` decide ce qu'on LIT : le titre plutot que l'URL, parce
 * qu'un titre survit au lien mort — quatre des cinq musiques de l'historique
 * pointent vers des fichiers disparus avec l'ancien site.
 *
 * La GARDE sur le lien lui-meme (« ce qui n'est pas http(s) ne devient jamais
 * cliquable ») est partagee avec la video : elle se teste dans `liens.spec.ts`.
 */

describe('fournisseurDe', () => {
  it('reconnaît les hébergeurs, sous-domaine compris', () => {
    expect(fournisseurDe('https://open.spotify.com/track/abc')).toBe('Spotify')
    expect(fournisseurDe('https://www.deezer.com/fr/track/4200101')).toBe('Deezer')
    expect(fournisseurDe('https://youtu.be/abc')).toBe('YouTube')
    expect(fournisseurDe('https://music.apple.com/fr/album/x')).toBe('Apple Music')
  })

  it('ne se laisse pas prendre par un hôte qui contient le domaine', () => {
    // `includes` aurait nomme celui-la « Spotify » : c'est le point du test.
    expect(fournisseurDe('https://spotify.com.exemple.net/piege')).toBeNull()
  })

  it('rend null pour un hébergeur inconnu ou un lien inutilisable', () => {
    expect(fournisseurDe('https://exemple.fr/morceau.mp3')).toBeNull()
    expect(fournisseurDe('javascript:alert(1)')).toBeNull()
  })
})

describe('presenterMusique', () => {
  it('ne montre rien quand le champ est vide', () => {
    expect(presenterMusique(null)).toBeNull()
    expect(presenterMusique({ titre: '', lien: '  ' })).toBeNull()
  })

  it('affiche le titre seul comme du texte', () => {
    expect(presenterMusique({ titre: 'Gene Vincent — Be-Bop-A-Lula' })).toEqual({
      texte: 'Gene Vincent — Be-Bop-A-Lula',
      lien: null,
      complement: null,
    })
  })

  it('rend le TITRE cliquable, jamais l URL brute', () => {
    expect(
      presenterMusique({
        titre: 'Elvis Presley — All Shook Up',
        lien: 'https://www.deezer.com/track/4200101',
      }),
    ).toEqual({
      texte: 'Elvis Presley — All Shook Up',
      lien: 'https://www.deezer.com/track/4200101',
      complement: 'Deezer',
    })
  })

  it('nomme l hébergeur quand il n y a que le lien', () => {
    expect(presenterMusique({ lien: 'https://open.spotify.com/track/abc' })).toEqual({
      texte: 'Écouter sur Spotify',
      lien: 'https://open.spotify.com/track/abc',
      complement: null,
    })
  })

  it('se rabat sur l hôte pour un hébergeur inconnu', () => {
    // On ne connait pas tout le monde, et ce n'est pas une raison pour montrer
    // une URL nue : l'hote dit deja ou l'on part.
    expect(presenterMusique({ lien: 'https://www.exemple.fr/morceau.mp3' })).toEqual({
      texte: 'exemple.fr',
      lien: 'https://www.exemple.fr/morceau.mp3',
      complement: null,
    })
  })

  it('n ouvre jamais un lien dangereux, et garde le titre lisible', () => {
    expect(presenterMusique({ titre: 'Un morceau', lien: 'javascript:alert(1)' })).toEqual({
      texte: 'Un morceau',
      lien: null,
      complement: null,
    })
  })

  it('montre une saisie inutilisable en texte plutôt que de la faire disparaître', () => {
    expect(presenterMusique({ lien: 'musiques/choregraphie-2012-V8.mp3' })).toEqual({
      texte: 'musiques/choregraphie-2012-V8.mp3',
      lien: null,
      complement: null,
    })
  })
})
