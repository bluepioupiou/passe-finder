import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { User } from '@/payload-types'
import { lireParIdentifiantPublic, lireParIdentifiantsPublics } from '@/lecture-enchainement'

/**
 * Identifiant opaque et trois visibilités (action item
 * `identifiant-opaque-et-visibilites`).
 *
 * CES TESTS SONT LE MODÈLE. Une fonction pure peut dire qui a le droit de lire ;
 * elle ne peut rien dire de ce que la BASE rend à une requête — et c'est là que
 * se joue le « non répertorié ». Chaque `it` ci-dessous verrouille une promesse
 * qu'on ne peut pas vérifier autrement :
 *
 *  - le non-répertorié n'est PAS dans ce que `access.read` rend. C'est ce qui le
 *    tient hors de la liste, hors de la recherche, et hors de
 *    `GET /api/enchainements` — la fuite qui viderait la fonction de son sens ;
 *  - il se lit par son lien, sans compte ;
 *  - un ancien numéro n'atteint plus rien ;
 *  - un favori ne se pose que sur présentation du lien, jamais sur un numéro.
 *    Sans cela, n'importe quel compte énumérerait 1, 2, 3… pour se constituer un
 *    favori sur chaque non-répertorié, et « mes favoris » les lui afficherait.
 */
describe('Visibilité et identifiant public', () => {
  let payload: Payload
  let auteur: User
  let eleve: User
  let idDanse: number
  let idDebut: number
  let idFin: number
  let idPasse: number

  let publicId: number
  let publicLien: string
  let nonRepertorieId: number
  let nonRepertorieLien: string
  let priveLien: string

  const enchainementsCrees: number[] = []

  async function creer(titre: string, visibilite: 'prive' | 'nonRepertorie' | 'public') {
    const cree = await payload.create({
      collection: 'enchainements',
      data: { titre, auteur: auteur.id, visibilite, passes: [{ passe: idPasse }] },
    })

    enchainementsCrees.push(cree.id)
    return { id: cree.id, lien: cree.idPublic as string }
  }

  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    auteur = await payload.create({
      collection: 'users',
      data: { email: 'test-visib-auteur@example.test', password: 'test-visib-auteur' },
    })
    eleve = await payload.create({
      collection: 'users',
      data: { email: 'test-visib-eleve@example.test', password: 'test-visib-eleve' },
    })

    const danses = await payload.find({ collection: 'danses', limit: 1, depth: 0 })
    idDanse = danses.docs[0].id as number

    const debut = await payload.create({
      collection: 'positions',
      data: { nom: 'Visibilité — départ', danse: idDanse },
    })
    const fin = await payload.create({
      collection: 'positions',
      data: { nom: 'Visibilité — arrivée', danse: idDanse },
    })
    idDebut = debut.id
    idFin = fin.id

    const passe = await payload.create({
      collection: 'passes',
      data: { nom: 'Visibilité — passe', positionDebut: idDebut, positionFin: idFin },
    })
    idPasse = passe.id

    const ouvert = await creer('Visibilité — public', 'public')
    publicId = ouvert.id
    publicLien = ouvert.lien

    const cache = await creer('Visibilité — non répertorié', 'nonRepertorie')
    nonRepertorieId = cache.id
    nonRepertorieLien = cache.lien

    priveLien = (await creer('Visibilité — privé', 'prive')).lien
  })

  afterAll(async () => {
    await payload.delete({
      collection: 'favoris',
      where: { enchainement: { in: enchainementsCrees } },
    })
    for (const id of enchainementsCrees) {
      await payload.delete({ collection: 'enchainements', id }).catch(() => null)
    }
    if (idPasse) await payload.delete({ collection: 'passes', id: idPasse })
    if (idDebut) await payload.delete({ collection: 'positions', id: idDebut })
    if (idFin) await payload.delete({ collection: 'positions', id: idFin })
    if (auteur) await payload.delete({ collection: 'users', id: auteur.id })
    if (eleve) await payload.delete({ collection: 'users', id: eleve.id })
  })

  // --- L'identifiant --------------------------------------------------------

  it('donne un identifiant public à chaque enchaînement créé', async () => {
    const { lien } = await creer('Visibilité — tout neuf', 'prive')

    expect(lien).toMatch(/^[A-Za-z0-9_-]{12}$/)
  })

  it('ne réécrit jamais l identifiant d un enchaînement modifié', async () => {
    // Une adresse qui change casse tous les liens déjà envoyés : c'est
    // exactement le contraire de ce que cette colonne existe pour offrir.
    const avant = await payload.findByID({ collection: 'enchainements', id: publicId, depth: 0 })

    await payload.update({
      collection: 'enchainements',
      id: publicId,
      data: { titre: 'Visibilité — public (corrigé)' },
    })

    const apres = await payload.findByID({ collection: 'enchainements', id: publicId, depth: 0 })
    expect(apres.idPublic).toBe(avant.idPublic)
  })

  // --- Axe « apparaît-il dans les listes » ----------------------------------

  it('ne liste jamais un non répertorié, ni pour un anonyme ni pour un autre compte', async () => {
    // LA PROMESSE CENTRALE, et elle se joue dans `access.read` — donc aussi
    // dans `GET /api/enchainements`, la liste et la recherche, sans qu'aucune
    // de ces surfaces ait à s'en souvenir.
    for (const utilisateur of [null, eleve]) {
      const { docs } = await payload.find({
        collection: 'enchainements',
        where: { id: { in: enchainementsCrees } },
        limit: 100,
        depth: 0,
        overrideAccess: false,
        user: utilisateur,
      })

      const vus = docs.map((doc) => doc.id)
      expect(vus).toContain(publicId)
      expect(vus).not.toContain(nonRepertorieId)
    }
  })

  it('laisse son auteur retrouver ses non répertoriés dans ses propres listes', async () => {
    // Sans cette moitié de la règle, un auteur perdrait de vue ce qu'il vient
    // de partager par lien.
    const { docs } = await payload.find({
      collection: 'enchainements',
      where: { id: { equals: nonRepertorieId } },
      depth: 0,
      overrideAccess: false,
      user: auteur,
    })

    expect(docs).toHaveLength(1)
  })

  it('refuse la lecture directe d un non répertorié par son numéro de ligne', async () => {
    // Le numéro reste dans la base, mais il n'ouvre plus rien : même l'API
    // locale, droits appliqués, ne le rend pas.
    const doc = await payload
      .findByID({
        collection: 'enchainements',
        id: nonRepertorieId,
        depth: 0,
        disableErrors: true,
        overrideAccess: false,
        user: eleve,
      })
      .catch(() => null)

    expect(doc).toBeNull()
  })

  // --- Axe « qui a le droit de lire », par le lien ---------------------------

  it('ouvre un non répertorié à qui présente le lien, sans compte', async () => {
    const doc = await lireParIdentifiantPublic(payload, nonRepertorieLien, null)

    expect(doc?.titre).toBe('Visibilité — non répertorié')
  })

  it('refuse un privé même à qui présente le lien', async () => {
    expect(await lireParIdentifiantPublic(payload, priveLien, null)).toBeNull()
    expect(await lireParIdentifiantPublic(payload, priveLien, eleve)).toBeNull()
    // Son auteur, lui, le lit.
    expect(await lireParIdentifiantPublic(payload, priveLien, auteur)).not.toBeNull()
  })

  it('ne répond à aucune ancienne adresse numérique', async () => {
    // Décidé avec Alain le 2026-09-01 : les laisser vivre annulerait tout ce
    // modèle — on retrouverait n'importe quel non-répertorié en comptant.
    for (const ancienne of ['1', '12', '120', String(nonRepertorieId)]) {
      expect(await lireParIdentifiantPublic(payload, ancienne, null)).toBeNull()
    }
  })

  it('ne répond pas à un identifiant de la bonne forme mais inconnu', async () => {
    expect(await lireParIdentifiantPublic(payload, 'AAAAAAAAAAAA', auteur)).toBeNull()
  })

  // --- Les favoris ----------------------------------------------------------

  it('refuse de poser un favori par le numéro de ligne', async () => {
    // LE VERROU. Sans lui, n'importe quel compte connecté énumérerait les
    // numéros pour se constituer un favori sur chaque non-répertorié — et
    // « mes favoris » les lui afficherait tous.
    await expect(
      payload.create({
        collection: 'favoris',
        data: { utilisateur: eleve.id, enchainement: nonRepertorieId },
        overrideAccess: false,
        user: eleve,
      }),
    ).rejects.toThrow()

    const poses = await payload.count({
      collection: 'favoris',
      where: { enchainement: { equals: nonRepertorieId } },
    })
    expect(poses.totalDocs).toBe(0)
  })

  it('refuse un lien qui ne désigne rien', async () => {
    await expect(
      payload.create({
        collection: 'favoris',
        data: { utilisateur: eleve.id, idPublic: 'AAAAAAAAAAAA' },
        overrideAccess: false,
        user: eleve,
      }),
    ).rejects.toThrow()
  })

  it('accepte un favori sur un non répertorié reçu par lien, et le rend lisible', async () => {
    // Décision d'Alain (2026-09-01) : ce qu'on reçoit, on peut le ranger.
    await payload.create({
      collection: 'favoris',
      data: { utilisateur: eleve.id, idPublic: nonRepertorieLien },
      overrideAccess: false,
      user: eleve,
    })

    // Et « mes favoris » sait l'afficher en rejouant le lien conservé — la
    // lecture ordinaire, elle, ne le rendrait pas.
    const lus = await lireParIdentifiantsPublics(payload, [nonRepertorieLien], eleve)
    expect(lus.map((doc) => doc.id)).toEqual([nonRepertorieId])
  })

  it('fait disparaître des favoris ce qui est repassé en privé', async () => {
    // Ce qu'on rejoue est une ADRESSE, pas un droit acquis : l'auteur reste
    // maître de ce qu'il montre, même après coup.
    await payload.update({
      collection: 'enchainements',
      id: nonRepertorieId,
      data: { visibilite: 'prive' },
    })

    expect(await lireParIdentifiantsPublics(payload, [nonRepertorieLien], eleve)).toEqual([])

    await payload.update({
      collection: 'enchainements',
      id: nonRepertorieId,
      data: { visibilite: 'nonRepertorie' },
    })
  })

  it('garde l ordre demandé et écarte les liens illisibles', async () => {
    const lus = await lireParIdentifiantsPublics(
      payload,
      [nonRepertorieLien, priveLien, publicLien],
      eleve,
    )

    expect(lus.map((doc) => doc.id)).toEqual([nonRepertorieId, publicId])
  })
})
