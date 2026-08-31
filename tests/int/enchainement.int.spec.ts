import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

/**
 * Collection Enchainement (Stories 4.3 / 6.3).
 *
 * Deux comportements sont testes ici parce qu'ils protegent des donnees :
 *  - le defaut PRIVE et l'invisibilite d'un enchainement prive pour un anonyme
 *    (FR-17 / AD-6) — on ne partage jamais par accident ;
 *  - le refus de supprimer une passe encore utilisee (FR-8 / AD-6) — sinon la
 *    suppression viderait un maillon au milieu des enchainements des eleves.
 *
 * Le jeu d'essai est entierement autonome (utilisateur, positions, passe,
 * enchainement crees puis detruits) : aucun test ne s'appuie sur le catalogue
 * migre, et aucune donnee reelle n'est mise en jeu.
 */
describe('Enchainement', () => {
  let payload: Payload
  let idUtilisateur: number
  let idPositionDebut: number
  let idPositionFin: number
  let idPasse: number
  let idEnchainement: number
  let idDanse: number

  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    const utilisateur = await payload.create({
      collection: 'users',
      data: { email: 'test-enchainement@example.test', password: 'test-enchainement' },
    })
    idUtilisateur = utilisateur.id as number

    // La danse est remplie automatiquement a la creation (v1 mono-danse), mais
    // le type genere la reclame : on la lit une fois et on la passe.
    const danses = await payload.find({ collection: 'danses', limit: 1, depth: 0 })
    idDanse = danses.docs[0].id as number

    const debut = await payload.create({
      collection: 'positions',
      data: { nom: 'Position de test — départ', danse: idDanse },
    })
    const fin = await payload.create({
      collection: 'positions',
      data: { nom: 'Position de test — arrivée', danse: idDanse },
    })
    idPositionDebut = debut.id as number
    idPositionFin = fin.id as number

    const passe = await payload.create({
      collection: 'passes',
      data: { nom: 'Passe de test', positionDebut: idPositionDebut, positionFin: idPositionFin },
    })
    idPasse = passe.id as number
  })

  afterAll(async () => {
    // Ordre impose par la garde : l'enchainement d'abord, la passe ensuite.
    if (idEnchainement) await payload.delete({ collection: 'enchainements', id: idEnchainement })
    if (idPasse) await payload.delete({ collection: 'passes', id: idPasse })
    if (idPositionDebut) await payload.delete({ collection: 'positions', id: idPositionDebut })
    if (idPositionFin) await payload.delete({ collection: 'positions', id: idPositionFin })
    if (idUtilisateur) await payload.delete({ collection: 'users', id: idUtilisateur })
  })

  it('est prive par defaut', async () => {
    // `visibilite` est volontairement absente : c'est l'objet du test. Le type
    // genere la reclame (champ requis), Payload la remplit avec sa valeur par
    // defaut avant validation — d'ou l'ecart de type, attendu ici.
    const enchainement = await payload.create(
      // @ts-expect-error visibilite omise a dessein : on verifie le defaut prive
      {
        collection: 'enchainements',
        data: {
          titre: 'Enchainement de test',
          auteur: idUtilisateur,
          passes: [{ passe: idPasse }],
        },
      },
    )
    idEnchainement = enchainement.id as number

    expect(enchainement.visibilite).toBe('prive')
  })

  it("reste invisible pour un visiteur anonyme tant qu'il est prive", async () => {
    const anonyme = await payload.find({
      collection: 'enchainements',
      where: { id: { equals: idEnchainement } },
      overrideAccess: false,
      depth: 0,
    })
    expect(anonyme.totalDocs).toBe(0)

    // Meme refus par identifiant : c'est le chemin exact de la fiche publique
    // (`/enchainements/<id>`), qui repond 404 sur ce `null`. Sans ce test, la
    // liste pourrait cacher un enchainement prive que son URL laisserait lire.
    const parIdentifiant = await payload.findByID({
      collection: 'enchainements',
      id: idEnchainement,
      overrideAccess: false,
      disableErrors: true,
      depth: 0,
    })
    expect(parIdentifiant).toBeNull()

    await payload.update({
      collection: 'enchainements',
      id: idEnchainement,
      data: { visibilite: 'partage' },
    })

    const partage = await payload.find({
      collection: 'enchainements',
      where: { id: { equals: idEnchainement } },
      overrideAccess: false,
      depth: 0,
    })
    expect(partage.totalDocs).toBe(1)
  })

  it('conserve les passes dans leur ordre', async () => {
    const relu = await payload.findByID({
      collection: 'enchainements',
      id: idEnchainement,
      depth: 0,
    })
    expect(relu.passes.map((maillon) => maillon.passe)).toEqual([idPasse])
  })

  it('accepte une musique, titre et lien', async () => {
    const avec = await payload.update({
      collection: 'enchainements',
      id: idEnchainement,
      data: {
        musique: {
          titre: 'Elvis Presley — All Shook Up',
          lien: 'https://www.deezer.com/track/4200101',
        },
      },
    })

    expect(avec.musique?.titre).toBe('Elvis Presley — All Shook Up')
    expect(avec.musique?.lien).toBe('https://www.deezer.com/track/4200101')
  })

  it('refuse un lien de musique qui n est pas une adresse web', async () => {
    // La garde qui compte : ce champ est rempli par les eleves et rendu en
    // `<a href>` sur une fiche que d'autres ouvrent. L'affichage se protege de
    // son cote (`presenterMusique`), mais la collection tranche — sans quoi une
    // valeur pareille pourrait entrer par l'API sans jamais passer par le
    // compositeur.
    await expect(
      payload.update({
        collection: 'enchainements',
        id: idEnchainement,
        data: { musique: { lien: 'javascript:alert(1)' } },
      }),
    ).rejects.toThrow()

    // Et la valeur precedente est intacte : le refus n'a rien ecrit au passage.
    const relu = await payload.findByID({
      collection: 'enchainements',
      id: idEnchainement,
      depth: 0,
    })
    expect(relu.musique?.lien).toBe('https://www.deezer.com/track/4200101')
  })

  it('empeche de supprimer une passe utilisee', async () => {
    await expect(payload.delete({ collection: 'passes', id: idPasse })).rejects.toThrow(
      /Suppression impossible/,
    )

    // La passe est toujours la : le refus n'a rien supprime au passage.
    const passe = await payload.findByID({ collection: 'passes', id: idPasse, depth: 0 })
    expect(passe.nom).toBe('Passe de test')
  })
})
