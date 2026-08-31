'use server'

import { cookies } from 'next/headers.js'
import { redirect } from 'next/navigation'
import { getPayload, type Payload } from 'payload'

import config from '@/payload.config'

/**
 * Inscription, connexion, deconnexion (Stories 3.1 / 3.2, FR-26).
 *
 * Tout passe par l'auth integree de Payload (AD-9) : hachage, sessions, jeton.
 * Rien n'est reimplemente ici — ces actions posent le COOKIE et traduisent les
 * erreurs, c'est tout.
 */

export type EtatFormulaire = { erreur?: string }

/** Longueur minimale du mot de passe. Payload n'en impose aucune. */
const LONGUEUR_MOT_DE_PASSE = 8

/**
 * Pose le cookie de session que `payload.auth()` relira ensuite.
 *
 * Le nom depend du prefixe configure : on le lit plutot que de l'ecrire en dur,
 * pour qu'un changement de configuration ne laisse pas ici un cookie orphelin
 * que plus personne ne relit.
 */
async function poserSession(payload: Payload, jeton: string, expiration: number): Promise<void> {
  const magasin = await cookies()

  magasin.set(`${payload.config.cookiePrefix ?? 'payload'}-token`, jeton, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    // En clair sur http://localhost, chiffre des qu'on est en HTTPS : sans ce
    // conditionnel, le cookie serait rejete en developpement et personne ne
    // resterait connecte.
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(expiration * 1000),
  })
}

/**
 * Ou renvoyer apres une connexion reussie.
 *
 * N'accepte qu'un chemin INTERNE. Sans ce filtre, `?suite=https://ailleurs`
 * ferait de notre page de connexion un tremplin vers un site tiers — une
 * redirection ouverte, c'est-a-dire un hameconnage credible signe de notre
 * domaine. Le double slash est refuse pour la meme raison (`//exemple.com` est
 * une URL absolue).
 */
function destination(suite: FormDataEntryValue | null): string {
  if (typeof suite !== 'string') return '/'
  if (!suite.startsWith('/') || suite.startsWith('//')) return '/'

  return suite
}

function texte(donnees: FormData, champ: string): string {
  const valeur = donnees.get(champ)
  return typeof valeur === 'string' ? valeur.trim() : ''
}

export async function sInscrire(
  _precedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const email = texte(donnees, 'email').toLowerCase()
  const motDePasse = texte(donnees, 'motDePasse')
  const ou = destination(donnees.get('suite'))

  if (email === '') return { erreur: 'Il manque ton adresse e-mail.' }
  if (motDePasse.length < LONGUEUR_MOT_DE_PASSE) {
    return { erreur: `Le mot de passe fait au moins ${LONGUEUR_MOT_DE_PASSE} caractères.` }
  }

  const payload = await getPayload({ config: await config })

  try {
    // `overrideAccess: false` : c'est l'`access.create` de la collection qui
    // autorise l'inscription publique, pas cette action. Consequence utile, le
    // champ `admin` reste hors de portee meme si le formulaire etait force.
    await payload.create({
      collection: 'users',
      overrideAccess: false,
      data: { email, password: motDePasse },
    })
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : ''

    // Payload renvoie une erreur de validation sur l'unicite de l'email. Le
    // message brut parle de « email » en anglais : on le traduit en clair.
    if (/email/i.test(message)) {
      return { erreur: 'Un compte existe déjà avec cette adresse e-mail.' }
    }
    return { erreur: message || "La création du compte a échoué. Réessaie." }
  }

  // Compte cree : on ouvre la session dans la foulee (FR-26, « je suis
  // authentifié »), plutot que de renvoyer vers un formulaire de connexion.
  const session = await payload.login({
    collection: 'users',
    data: { email, password: motDePasse },
  })

  if (session.token && session.exp) await poserSession(payload, session.token, session.exp)

  redirect(ou)
}

export async function seConnecter(
  _precedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const email = texte(donnees, 'email').toLowerCase()
  const motDePasse = texte(donnees, 'motDePasse')
  const ou = destination(donnees.get('suite'))

  if (email === '' || motDePasse === '') {
    return { erreur: 'Renseigne ton adresse e-mail et ton mot de passe.' }
  }

  const payload = await getPayload({ config: await config })

  let jeton: string | undefined
  let expiration: number | undefined

  try {
    const session = await payload.login({
      collection: 'users',
      data: { email, password: motDePasse },
    })
    jeton = session.token
    expiration = session.exp
  } catch {
    // UN SEUL message pour « compte inconnu » et « mot de passe faux » : deux
    // messages distincts diraient a un inconnu quelles adresses ont un compte
    // ici.
    return { erreur: 'Adresse e-mail ou mot de passe incorrect.' }
  }

  if (!jeton || !expiration) return { erreur: 'La connexion a échoué. Réessaie.' }

  await poserSession(payload, jeton, expiration)

  redirect(ou)
}

export async function seDeconnecter(): Promise<void> {
  const payload = await getPayload({ config: await config })
  const magasin = await cookies()

  magasin.delete(`${payload.config.cookiePrefix ?? 'payload'}-token`)

  redirect('/')
}
