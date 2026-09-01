import { describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'
import { libelleVisibilite, peutLire, PROMESSES, VISIBILITES, visibiliteSure } from '@/visibilite'

/**
 * Le modèle de visibilité (action item `identifiant-opaque-et-visibilites`).
 *
 * `peutLire` porte l'axe « QUI a le droit de lire », et n'est consulté que par
 * les chemins qui présentent l'identifiant public. L'autre axe — « apparaît-il
 * dans les listes » — vit dans les `access` de la collection et se vérifie en
 * intégration : une fonction pure ne peut rien dire d'une contrainte de requête.
 */

const eleve = { id: 7, admin: false } as User
const autre = { id: 8, admin: false } as User
const patron = { id: 9, admin: true } as User

describe('peutLire', () => {
  it('ouvre un public à tout le monde, connecté ou non', () => {
    expect(peutLire({ visibilite: 'public', auteur: 7 }, null)).toBe(true)
    expect(peutLire({ visibilite: 'public', auteur: 7 }, autre)).toBe(true)
  })

  it('ouvre un non répertorié à qui présente le lien', () => {
    // C'EST TOUTE LA FONCTION : on n'arrive ici qu'avec l'identifiant public en
    // main, et le connaître vaut autorisation. Pas de compte demandé — un élève
    // doit pouvoir ouvrir le lien reçu sans s'inscrire (FR-19).
    expect(peutLire({ visibilite: 'nonRepertorie', auteur: 7 }, null)).toBe(true)
    expect(peutLire({ visibilite: 'nonRepertorie', auteur: 7 }, autre)).toBe(true)
  })

  it('garde le privé pour son auteur', () => {
    expect(peutLire({ visibilite: 'prive', auteur: 7 }, eleve)).toBe(true)
    expect(peutLire({ visibilite: 'prive', auteur: { id: 7 } as User }, eleve)).toBe(true)
  })

  it('refuse le privé à tous les autres, lien ou pas', () => {
    // Le lien n'achète rien sur un privé : c'est ce qui distingue les deux
    // fermetures. « Non répertorié » se partage, « privé » ne se partage pas.
    expect(peutLire({ visibilite: 'prive', auteur: 7 }, null)).toBe(false)
    expect(peutLire({ visibilite: 'prive', auteur: 7 }, autre)).toBe(false)
  })

  it('laisse un administrateur lire un privé', () => {
    expect(peutLire({ visibilite: 'prive', auteur: 7 }, patron)).toBe(true)
  })
})

describe('visibiliteSure', () => {
  it('garde les trois valeurs connues', () => {
    for (const option of VISIBILITES) {
      expect(visibiliteSure(option.value)).toBe(option.value)
    }
  })

  it('ramène tout le reste au privé', () => {
    // AD-6 : une valeur inattendue — formulaire bricolé, script d'une autre
    // version, faute de frappe — ne doit JAMAIS aboutir à une publication.
    expect(visibiliteSure('partage')).toBe('prive')
    expect(visibiliteSure('Public')).toBe('prive')
    expect(visibiliteSure('')).toBe('prive')
    expect(visibiliteSure(undefined)).toBe('prive')
    expect(visibiliteSure(null)).toBe('prive')
    expect(visibiliteSure({ value: 'public' })).toBe('prive')
  })
})

describe('libelleVisibilite', () => {
  it('nomme les trois cas', () => {
    expect(libelleVisibilite('prive')).toBe('Privé')
    expect(libelleVisibilite('nonRepertorie')).toBe('Non répertorié')
    expect(libelleVisibilite('public')).toBe('Public')
  })

  it('rend null pour une valeur inconnue', () => {
    // La fiche n'affiche alors pas de badge, plutôt qu'un badge vide.
    expect(libelleVisibilite('partage')).toBeNull()
  })
})

describe('PROMESSES', () => {
  it('en couvre exactement les trois visibilités', () => {
    // Une visibilité ajoutée sans sa phrase laisserait un menu muet à l'écran :
    // c'est le genre d'oubli qui ne se voit qu'en production.
    expect(Object.keys(PROMESSES).sort()).toEqual(VISIBILITES.map((o) => o.value).sort())
  })
})
