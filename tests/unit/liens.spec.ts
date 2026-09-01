import { describe, expect, it } from 'vitest'

import { fournisseurParmi, hoteDe, lienSur } from '@/liens'

/**
 * La garde sur les liens saisis (Stories 4.5 / 4.6).
 *
 * PARTAGEE par la musique et la video, parce que la question est la meme des
 * deux cotes : ces champs sont remplis par les eleves et RENDUS EN `<a href>`
 * sur une fiche que d'autres ouvrent. Ce qui n'est pas http(s) ne doit jamais
 * devenir cliquable. La collection et les deux actions serveur s'appuient
 * toutes sur `lienSur` : c'est le test qui les couvre toutes.
 */

describe('lienSur', () => {
  it('accepte http et https', () => {
    expect(lienSur('https://open.spotify.com/track/abc')).toBe('https://open.spotify.com/track/abc')
    expect(lienSur('http://www.deezer.com/track/1')).toBe('http://www.deezer.com/track/1')
  })

  it('complète un lien recopié sans son protocole', () => {
    // Ce qu'on obtient en recopiant une barre d'adresse plutot qu'en utilisant
    // « Partager ». Refuser cette forme ferait passer une saisie juste pour une
    // faute.
    expect(lienSur('open.spotify.com/track/abc')).toBe('https://open.spotify.com/track/abc')
  })

  it('refuse tout ce qui n est pas une adresse web', () => {
    // Le cas qui compte vraiment : une saisie utilisateur rendue en lien.
    expect(lienSur('javascript:alert(1)')).toBeNull()
    expect(lienSur('data:text/html,<script>')).toBeNull()
    // Chemin relatif de l'ancien site : rien a ouvrir depuis le nouveau.
    expect(lienSur('musiques/choregraphie-2012-V8.mp3')).toBeNull()
    // Un titre saisi dans la mauvaise case ne doit pas devenir un lien.
    expect(lienSur('Gene Vincent — Be-Bop-A-Lula')).toBeNull()
    expect(lienSur('   ')).toBeNull()
    expect(lienSur(null)).toBeNull()
  })
})

describe('hoteDe', () => {
  it('donne l hôte sans le www', () => {
    expect(hoteDe('https://www.exemple.fr/morceau.mp3')).toBe('exemple.fr')
    expect(hoteDe('https://open.spotify.com/track/abc')).toBe('open.spotify.com')
  })
})

describe('fournisseurParmi', () => {
  const fournisseurs = [
    { nom: 'Spotify', domaines: ['spotify.com'] },
    { nom: 'YouTube', domaines: ['youtube.com', 'youtu.be'] },
  ]

  it('reconnaît un hébergeur, sous-domaine compris', () => {
    expect(fournisseurParmi('https://open.spotify.com/track/abc', fournisseurs)).toBe('Spotify')
    expect(fournisseurParmi('https://youtu.be/abc', fournisseurs)).toBe('YouTube')
  })

  it('ne se laisse pas prendre par un hôte qui CONTIENT le domaine', () => {
    // C'est le point du test : `includes` aurait nomme celui-la « Spotify », et
    // l'affichage aurait certifie une adresse qui n'a rien a voir.
    expect(fournisseurParmi('https://spotify.com.exemple.net/piege', fournisseurs)).toBeNull()
  })

  it('rend null pour un inconnu ou un lien inutilisable', () => {
    expect(fournisseurParmi('https://exemple.fr/x', fournisseurs)).toBeNull()
    expect(fournisseurParmi('javascript:alert(1)', fournisseurs)).toBeNull()
  })
})
