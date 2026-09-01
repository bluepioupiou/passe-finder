'use server'

import { cookies } from 'next/headers.js'
import { redirect } from 'next/navigation'
import { getPayload, type Payload } from 'payload'

import { erreurPseudo, nettoyerPseudo, pseudoComparable } from '@/auteurs'
import config from '@/payload.config'
import { sessionCourante } from '@/porte'

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

/** Etat du formulaire de pseudo : une erreur, ou la confirmation d'un enregistrement. */
export type EtatPseudo = { erreur?: string; enregistre?: boolean }

/**
 * Choisir (ou effacer) son pseudo — le nom affiche comme auteur.
 *
 * PAS DE REDIRECTION : on reste sur la page du compte et on confirme sur place.
 * Renvoyer ailleurs apres un changement de nom obligerait a revenir verifier ce
 * qui a ete enregistre.
 *
 * TROIS VERIFICATIONS, ET AUCUNE N'EST DE TROP :
 *
 *  - la FORME, par `erreurPseudo` — la meme fonction que le champ de la
 *    collection, pour que /admin et l'API ne soient pas plus permissifs ;
 *  - la DISPONIBILITE, ici, pour pouvoir dire « ce pseudo est deja pris »
 *    plutot que de laisser remonter l'erreur d'index de SQLite ;
 *  - l'index UNIQUE de la base, qui reste le seul garant reel : entre la
 *    verification et l'ecriture, quelqu'un d'autre peut avoir pris le nom. Le
 *    `catch` traduit ce cas plutot que d'afficher un message technique.
 *
 * L'ECRITURE PASSE PAR LES `access` (`overrideAccess: false` avec l'utilisateur
 * de la session, ADD-5) : c'est `soiMemeOuAdmin` qui garantit qu'on ne renomme
 * que soi, et non une regle recopiee ici.
 *
 * Rien a revalider : toutes les pages qui affichent un auteur sont en
 * `force-dynamic`, elles reliront le nom au prochain affichage.
 */
export async function enregistrerPseudo(
  _precedent: EtatPseudo,
  donnees: FormData,
): Promise<EtatPseudo> {
  const utilisateur = await sessionCourante()
  if (!utilisateur) return { erreur: 'Session expirée : reconnecte-toi, puis réessaie.' }

  const pseudo = nettoyerPseudo(texte(donnees, 'pseudo'))

  const probleme = erreurPseudo(pseudo)
  if (probleme !== null) return { erreur: probleme }

  const payload = await getPayload({ config: await config })

  if (pseudo !== '') {
    // Contourne les `access` a dessein : la disponibilite d'un pseudo se
    // constate sur TOUS les comptes, y compris ceux qu'on n'a pas le droit de
    // lire. Seule l'existence du nom fuit — c'est le prix de l'unicite, et ce
    // nom est justement celui qui s'affiche en public.
    const { totalDocs } = await payload.count({
      collection: 'users',
      where: {
        and: [
          { pseudoNormalise: { equals: pseudoComparable(pseudo) } },
          { id: { not_equals: utilisateur.id } },
        ],
      },
    })

    if (totalDocs > 0) return { erreur: 'Ce pseudo est déjà pris. Essaie une variante.' }
  }

  try {
    await payload.update({
      collection: 'users',
      id: utilisateur.id,
      overrideAccess: false,
      user: utilisateur,
      // `null` et non `undefined` : un champ vide doit EFFACER le pseudo et
      // remettre l'affichage sur l'email. `undefined` laisserait l'ancien.
      data: { pseudo: pseudo === '' ? null : pseudo },
    })
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : ''

    if (/pseudo/i.test(message)) return { erreur: 'Ce pseudo est déjà pris. Essaie une variante.' }
    return { erreur: message || "L'enregistrement a échoué. Réessaie." }
  }

  return { enregistre: true }
}
