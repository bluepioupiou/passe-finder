import { describe, expect, it } from 'vitest'

import { fournisseurVideoDe, presenterVideo } from '@/video'

/**
 * La video d'un enchainement (Story 4.6, demande d'Alain 2026-08-31).
 *
 * UN SEUL CHAMP, contrairement a la musique, et les tests le disent : il n'y a
 * pas de titre a saisir, donc pas de « titre qui survit au lien mort ». Une
 * video de cours ne se nomme pas, elle se regarde — l'affichage nomme donc
 * l'HEBERGEUR.
 *
 * La garde sur le lien lui-meme est partagee et testee dans `liens.spec.ts`.
 */

describe('fournisseurVideoDe', () => {
  it('reconnaît les hébergeurs de vidéo', () => {
    expect(fournisseurVideoDe('https://www.youtube.com/watch?v=abc')).toBe('YouTube')
    expect(fournisseurVideoDe('https://youtu.be/abc')).toBe('YouTube')
    expect(fournisseurVideoDe('https://vimeo.com/123')).toBe('Vimeo')
    expect(fournisseurVideoDe('https://www.dailymotion.com/video/x1')).toBe('Dailymotion')
    expect(fournisseurVideoDe('https://drive.google.com/file/d/x/view')).toBe('Google Drive')
  })

  it('ignore les hébergeurs de MUSIQUE, qui ne sont pas les mêmes', () => {
    // Deux listes distinctes a dessein : « Voir sur Spotify » n'aurait aucun
    // sens, et la video ne se range pas chez Deezer.
    expect(fournisseurVideoDe('https://open.spotify.com/track/abc')).toBeNull()
    expect(fournisseurVideoDe('https://www.deezer.com/track/1')).toBeNull()
  })
})

describe('presenterVideo', () => {
  it('ne montre rien quand le champ est vide', () => {
    expect(presenterVideo(null)).toBeNull()
    expect(presenterVideo('   ')).toBeNull()
  })

  it('nomme l hébergeur', () => {
    expect(presenterVideo('https://www.youtube.com/watch?v=abc')).toEqual({
      texte: 'Voir sur YouTube',
      lien: 'https://www.youtube.com/watch?v=abc',
    })
  })

  it('se rabat sur l hôte pour un hébergeur inconnu', () => {
    // Un lien inconnu reste cliquable : l'hote dit au moins ou l'on part.
    expect(presenterVideo('https://www.exemple.fr/cours.mp4')).toEqual({
      texte: 'exemple.fr',
      lien: 'https://www.exemple.fr/cours.mp4',
    })
  })

  it('n ouvre jamais un lien dangereux', () => {
    expect(presenterVideo('javascript:alert(1)')).toEqual({
      texte: 'javascript:alert(1)',
      lien: null,
    })
  })
})
