import { headers as getHeaders } from 'next/headers.js'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from './payload.config'
import type { User } from './payload-types'

/**
 * Porte d'acces aux actions reservees (Story 3.5, FR-27 / UX-DR13).
 *
 * LE CONTRAT, en un endroit. Composer (Epic 4), mettre en favori et le profil
 * (Epic 5) demandent tous « es-tu connecte ? » puis « reviens ou tu voulais
 * aller ». Ecrit trois fois, ce couple derive : une page redirige, une autre
 * affiche une invitation, une troisieme oublie le retour. Ecrit ici, il se lit
 * et se corrige a un seul endroit.
 *
 * DEUX FORMES, PARCE QU'IL Y A DEUX SITUATIONS — et c'est la distinction qui
 * fait la valeur de ce module :
 *
 *  - une PAGE peut rediriger : la personne n'a encore rien fait, l'emmener vers
 *    la connexion ne lui coute rien ;
 *  - une ACTION ne le peut pas sans degat : elle est appelee alors qu'un travail
 *    est deja a l'ecran (une chaine composee, un formulaire rempli). Rediriger
 *    le jetterait. Elle doit donc recevoir une reponse et decider elle-meme
 *    quoi afficher, en gardant le travail (NFR-4, UX-DR16).
 *
 * Aucune des deux ne remplace les `access` de Payload : cette porte soigne le
 * PARCOURS, la collection garde la securite (ADD-5). Les deux verifient, et
 * c'est voulu — une porte d'interface ne protege rien a elle seule.
 */

/** L'utilisateur de la session, ou `null`. Ne redirige jamais. */
export async function sessionCourante(): Promise<User | null> {
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth({ headers: await getHeaders() })

  return user ?? null
}

/**
 * Exige une session pour une PAGE. Renvoie l'utilisateur, ou redirige vers la
 * connexion en emportant le chemin d'origine.
 *
 * `retour` doit etre le chemin de la page appelante : c'est lui qui sera rejoue
 * apres la connexion. On le passe explicitement plutot que de le deviner —
 * Next ne donne pas l'URL courante a un composant serveur de facon fiable, et
 * une valeur devinee qui se trompe renverrait la personne ailleurs que la ou
 * elle voulait aller, ce qui est pire que de ne pas la renvoyer du tout.
 */
export async function exigerSession(retour: string): Promise<User> {
  const utilisateur = await sessionCourante()

  if (!utilisateur) {
    redirect(`/connexion?suite=${encodeURIComponent(retour)}`)
  }

  return utilisateur
}
