import { describe, expect, it } from 'vitest'

import {
  CHEMIN_REINITIALISATION,
  lienDeReinitialisation,
  messageDeReinitialisation,
  sujetDeReinitialisation,
} from '@/courriel'

/**
 * Le message de reinitialisation (Story 3.3).
 *
 * CE FICHIER EXISTE POUR UN SEUL DEFAUT, celui qui aurait coute le plus cher :
 * le message par defaut de Payload pointe vers `/admin/reset/<jeton>`,
 * c'est-a-dire le back-office, reserve aux administrateurs depuis la Story 3.2.
 * Un eleve qui cliquerait dessus arriverait devant une porte fermee APRES avoir
 * consomme son unique jeton. Rien, dans le typage, n'empeche de revenir au
 * comportement par defaut en supprimant `generateEmailHTML` : ces tests le
 * verrouillent.
 */
describe('Message de reinitialisation', () => {
  const jeton = 'abcdef0123456789'

  it('mene a la page publique, jamais au back-office', () => {
    const lien = lienDeReinitialisation(jeton)

    expect(lien).toContain(CHEMIN_REINITIALISATION)
    expect(lien).toContain(`jeton=${jeton}`)
    expect(lien).not.toContain('/admin')
  })

  it('porte une adresse absolue, la seule utilisable depuis une messagerie', () => {
    // Un lien relatif s'afficherait tel quel dans le client de messagerie :
    // il n'y a pas de page courante d'ou le resoudre.
    expect(lienDeReinitialisation(jeton)).toMatch(/^https?:\/\//)
  })

  it('echappe le jeton dans l adresse', () => {
    expect(lienDeReinitialisation('a b+c')).toContain('jeton=a%20b%2Bc')
  })

  it('ecrit le lien en toutes lettres en plus du lien cliquable', () => {
    const message = messageDeReinitialisation(jeton)
    const lien = lienDeReinitialisation(jeton)

    // Deux occurrences : l'attribut `href` et le texte visible, pour les
    // clients qui n'affichent pas le HTML.
    expect(message.split(lien).length - 1).toBe(2)
  })

  it('annonce la duree de validite et le recours en cas de demande non sollicitee', () => {
    const message = messageDeReinitialisation(jeton)

    expect(message).toContain('une heure')
    expect(message).toContain('ignore ce message')
  })

  it('a un sujet en francais qui nomme le site', () => {
    expect(sujetDeReinitialisation()).toContain('Passe Finder')
  })
})
