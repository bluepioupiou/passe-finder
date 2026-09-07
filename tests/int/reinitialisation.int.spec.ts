/**
 * @vitest-environment node
 *
 * ENVIRONNEMENT NODE, ET NON JSDOM comme le reste des tests d'integration.
 * La signature du jeton de session (`jose`) refuse le `Uint8Array` fabrique par
 * jsdom : il vient d'un autre contexte d'execution, donc son `instanceof`
 * echoue. Erreur observee ici, et nulle part ailleurs, parce que ce fichier est
 * le seul a faire signer un jeton par Payload.
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { DELAI_ENTRE_DEUX_ENVOIS_MS, envoiTropRecent } from '@/courriel'
import config from '@/payload.config'
import type { User } from '@/payload-types'

/**
 * Recuperation d'acces (Story 3.3, FR-28).
 *
 * CE QUE CES TESTS PROTEGENT, et qu'un test unitaire ne peut pas voir : le
 * parcours passe par l'auth de Payload, sa table, ses jetons et leur date
 * d'expiration. Trois regles y vivent, et aucune n'est du code a nous :
 *
 *  - une adresse INCONNUE ne dit rien d'elle-meme (pas de fuite d'annuaire) ;
 *  - un jeton ne sert QU'UNE FOIS ;
 *  - le mot de passe change reellement, ce que seule une connexion prouve.
 *
 * `disableEmail` rend le jeton directement : la suite ne depend d'aucun envoi,
 * donc d'aucun reseau. C'est ce qui permet de tester tout le parcours sans
 * fournisseur d'e-mail, en local comme en CI.
 */
describe('Reinitialisation du mot de passe', () => {
  let payload: Payload
  let compte: User

  const email = 'test-reinit@example.test'
  const ancienMotDePasse = 'ancien-mot-de-passe'
  const nouveauMotDePasse = 'nouveau-mot-de-passe'

  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    compte = await payload.create({
      collection: 'users',
      data: { email, password: ancienMotDePasse },
    })
  })

  afterAll(async () => {
    if (compte) await payload.delete({ collection: 'users', id: compte.id })
  })

  it('ne revele pas qu une adresse est inconnue', async () => {
    const resultat = await payload.forgotPassword({
      collection: 'users',
      data: { email: 'personne-ici@example.test' },
      disableEmail: true,
    })

    // Payload s'arrete en silence : rien a signaler, donc rien a raconter au
    // visiteur. C'est ce qui permet a l'ecran d'afficher le meme accuse de
    // reception pour toutes les adresses.
    expect(resultat).toBeNull()
  })

  it('emet un jeton pour une adresse connue', async () => {
    const jeton = await payload.forgotPassword({
      collection: 'users',
      data: { email },
      disableEmail: true,
    })

    expect(typeof jeton).toBe('string')
    expect(jeton.length).toBeGreaterThan(20)
  })

  it('refuse un deuxieme envoi dans la minute, et laisse passer le suivant', async () => {
    await payload.forgotPassword({ collection: 'users', data: { email }, disableEmail: true })

    expect(await envoiTropRecent(payload, email)).toBe(true)

    // On vieillit le jeton au lieu d'attendre une minute : c'est la date
    // d'expiration qui porte l'age, puisque Payload ne stocke pas l'emission.
    const { docs } = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      showHiddenFields: true,
    })
    const expiration = new Date(docs[0]!.resetPasswordExpiration as string)

    await payload.update({
      collection: 'users',
      id: compte.id,
      data: {
        resetPasswordExpiration: new Date(
          expiration.getTime() - DELAI_ENTRE_DEUX_ENVOIS_MS - 1000,
        ).toISOString(),
      },
    })

    expect(await envoiTropRecent(payload, email)).toBe(false)
  })

  it('ne bloque pas une adresse qui n a jamais rien demande', async () => {
    expect(await envoiTropRecent(payload, 'personne-ici@example.test')).toBe(false)
  })

  it('change reellement le mot de passe, et ne laisse pas servir le jeton deux fois', async () => {
    const jeton = await payload.forgotPassword({
      collection: 'users',
      data: { email },
      disableEmail: true,
    })

    const resultat = await payload.resetPassword({
      collection: 'users',
      data: { password: nouveauMotDePasse, token: jeton },
      overrideAccess: true,
    })

    // Le jeton de SESSION rendu par l'operation : c'est lui qui permet
    // d'ouvrir la session dans la foulee, sans repasser par la connexion.
    expect(resultat.token).toBeTruthy()

    // La preuve que le mot de passe a change : l'ancien ne passe plus, le
    // nouveau passe.
    await expect(
      payload.login({ collection: 'users', data: { email, password: ancienMotDePasse } }),
    ).rejects.toThrow()

    const session = await payload.login({
      collection: 'users',
      data: { email, password: nouveauMotDePasse },
    })
    expect(session.token).toBeTruthy()

    // MEME JETON, DEUXIEME USAGE : refuse. Payload efface le jeton en meme
    // temps qu'il change le mot de passe.
    await expect(
      payload.resetPassword({
        collection: 'users',
        data: { password: 'encore-un-autre', token: jeton },
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  })

  it('refuse un jeton inconnu', async () => {
    await expect(
      payload.resetPassword({
        collection: 'users',
        data: { password: 'peu-importe-vraiment', token: 'jeton-invente-de-toutes-pieces' },
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  })

  it('refuse un jeton perime', async () => {
    const jeton = await payload.forgotPassword({
      collection: 'users',
      data: { email },
      disableEmail: true,
    })

    // On recule l'expiration dans le passe : c'est exactement ce que le temps
    // ferait, et la seule facon de le verifier sans attendre une heure.
    await payload.update({
      collection: 'users',
      id: compte.id,
      data: { resetPasswordExpiration: new Date(Date.now() - 1000).toISOString() },
    })

    await expect(
      payload.resetPassword({
        collection: 'users',
        data: { password: 'trop-tard-mon-ami', token: jeton },
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  })
})
