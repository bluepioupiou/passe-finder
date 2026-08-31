import { describe, expect, it } from 'vitest'

import { pointOEmbed, titreDeReponse, titreDuMorceau } from '@/musique-oembed'

/**
 * Recuperation du titre du morceau (demande d'Alain, 2026-08-31).
 *
 * AUCUN TEST NE TOUCHE LE RESEAU : `titreDuMorceau` recoit un `fetch` de
 * substitution. Un test qui dependrait de la disponibilite de Spotify ne
 * dirait plus rien du produit le jour ou il tomberait.
 *
 * Ce qui se verifie ici tient en une phrase : un enregistrement ne doit JAMAIS
 * echouer a cause d'un tiers. Panne, 404, lenteur, charge illisible — tout se
 * solde par « pas de titre », et la sauvegarde continue.
 */

/** Un `fetch` de substitution qui rend la charge donnee. */
function repond(charge: unknown, ok = true): typeof fetch {
  return (async () => ({ ok, json: async () => charge })) as unknown as typeof fetch
}

describe('pointOEmbed', () => {
  it('connaît les fournisseurs qui publient un point oEmbed', () => {
    expect(pointOEmbed('https://open.spotify.com/track/abc')).toBe(
      'https://open.spotify.com/oembed?url=https%3A%2F%2Fopen.spotify.com%2Ftrack%2Fabc',
    )
    expect(pointOEmbed('https://www.deezer.com/track/1')).toContain('api.deezer.com/oembed')
    expect(pointOEmbed('https://youtu.be/abc')).toContain('youtube.com/oembed')
  })

  it('rend null pour un hébergeur sans point oEmbed', () => {
    // Apple Music n'en publie pas : son lien reste sans titre automatique, ce
    // qui n'est pas une panne — la fiche affiche « Ecouter sur Apple Music ».
    expect(pointOEmbed('https://music.apple.com/fr/album/x')).toBeNull()
    expect(pointOEmbed('https://exemple.fr/morceau.mp3')).toBeNull()
  })

  it("n'interroge jamais l'adresse saisie elle-même", async () => {
    // La saisie ne voyage qu'en PARAMETRE d'un hote connu : un lien vers une
    // adresse interne ne peut pas faire emettre une requete au serveur.
    expect(pointOEmbed('http://localhost:3000/api/users')).toBeNull()
    expect(pointOEmbed('javascript:alert(1)')).toBeNull()
  })
})

describe('titreDeReponse', () => {
  it('prend le titre, débarrassé de ses espaces', () => {
    expect(titreDeReponse({ title: '  All Shook Up ' })).toBe('All Shook Up')
  })

  it('ignore l artiste, même quand le fournisseur le donne', () => {
    // Decision d'Alain : le titre suffit. Une regle unique vaut mieux qu'un
    // libelle qui changerait de forme selon l'hebergeur (Spotify ne rend pas
    // l'artiste, Deezer et YouTube si).
    expect(titreDeReponse({ title: 'Harder, Better', author_name: 'Daft Punk' })).toBe(
      'Harder, Better',
    )
  })

  it('se méfie de tout ce qui n est pas un titre utilisable', () => {
    // La charge vient d'un tiers : ce n'est pas un contrat.
    expect(titreDeReponse({ title: '' })).toBeNull()
    expect(titreDeReponse({ title: '   ' })).toBeNull()
    expect(titreDeReponse({ title: 42 })).toBeNull()
    expect(titreDeReponse({ titre: 'mauvaise clé' })).toBeNull()
    expect(titreDeReponse('pas un objet')).toBeNull()
    expect(titreDeReponse(null)).toBeNull()
    // Une page d'erreur deguisee en titre n'a rien a faire dans le champ.
    expect(titreDeReponse({ title: 'x'.repeat(201) })).toBeNull()
  })
})

describe('titreDuMorceau', () => {
  it('rend le titre publié par le fournisseur', async () => {
    expect(
      await titreDuMorceau('https://open.spotify.com/track/abc', repond({ title: 'Africa' })),
    ).toBe('Africa')
  })

  it('rend null sans jamais lever, quoi qu il arrive', async () => {
    const panne = (async () => {
      throw new Error('réseau coupé')
    }) as unknown as typeof fetch

    // Les quatre facons dont un tiers peut faire defaut, et la meme reponse aux
    // quatre : l'enregistrement continue sans titre.
    await expect(titreDuMorceau('https://open.spotify.com/track/abc', panne)).resolves.toBeNull()
    await expect(
      titreDuMorceau('https://open.spotify.com/track/abc', repond({}, false)),
    ).resolves.toBeNull()
    await expect(
      titreDuMorceau('https://open.spotify.com/track/abc', repond({ pas: 'un titre' })),
    ).resolves.toBeNull()
    await expect(titreDuMorceau('https://exemple.fr/morceau.mp3', repond({ title: 'X' }))).resolves.toBeNull()
  })

  it("n appelle personne quand il n y a rien à appeler", async () => {
    let appels = 0
    const compte = (async () => {
      appels += 1
      return { ok: true, json: async () => ({ title: 'X' }) }
    }) as unknown as typeof fetch

    expect(await titreDuMorceau('', compte)).toBeNull()
    expect(await titreDuMorceau(null, compte)).toBeNull()
    expect(await titreDuMorceau('music.apple.com/fr/album/x', compte)).toBeNull()
    expect(appels).toBe(0)
  })
})
