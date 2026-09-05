import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * LA REGLE DE LARGEUR DES VIGNETTES, verifiee sur le CODE SOURCE.
 *
 * `image-position.css` porte l'unique declaration de largeur du produit, et les
 * appelants la PARAMETRENT par `--image-position-taille` au lieu de la
 * contredire. La raison est ecrite la-bas : deux declarations de meme priorite
 * se departagent a l'ORDRE DE CHARGEMENT DES FICHIERS, un ordre que personne ne
 * controle et qui peut changer en ajoutant un import ailleurs.
 *
 * Le piege a deja mordu deux fois. D'abord sur `width`, ce qui a donne la
 * variable. Puis sur `max-width` : le contournement d'alors — `max-width: 220px`
 * sur `.fiche-image` — se battait avec le `max-width: 100%` de `.image-position`
 * a egalite de priorite. La vignette d'une fiche s'affichait enorme en arrivant
 * et normale apres un rechargement, selon le chemin emprunte. Les images de
 * l'atelier, trois fois plus larges que les anciennes, ont rendu l'ecart
 * spectaculaire.
 *
 * POURQUOI CE TEST PLUTOT QU'UN TEST DE RENDU. Un test de bout en bout ne
 * reproduit pas l'ordre de chargement fautif : il depend du bundler, du mode
 * dev ou production, et de ce qui a deja ete compile. Verifie, il passait
 * meme avec le defaut remis en place — il n'aurait donc rien garde. La regle,
 * elle, se verifie a coup sur : aucun appelant ne doit declarer de largeur.
 *
 * Le test DECOUVRE ses cibles au lieu de les lister : toute nouvelle surface
 * qui affiche une vignette est couverte le jour ou elle est ecrite.
 */

const RACINE = path.resolve(process.cwd(), 'src')

function fichiers(extension: string): string[] {
  const trouves: string[] = []
  const parcourir = (dossier: string) => {
    for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
      const chemin = path.join(dossier, entree.name)
      if (entree.isDirectory()) parcourir(chemin)
      else if (entree.name.endsWith(extension)) trouves.push(chemin)
    }
  }
  parcourir(RACINE)
  return trouves
}

/** Les classes passees a `<ImagePosition className="…">`, partout dans le site. */
function classesDeVignette(): string[] {
  const classes = new Set<string>()

  for (const chemin of fichiers('.tsx')) {
    const source = fs.readFileSync(chemin, 'utf8')
    for (const balise of source.match(/<ImagePosition[\s\S]*?\/>/g) ?? []) {
      const attribut = balise.match(/className="([^"]+)"/)
      if (!attribut) continue
      for (const classe of attribut[1].split(/\s+/)) if (classe) classes.add(classe)
    }
  }

  return [...classes]
}

describe('la largeur des vignettes de position', () => {
  const classes = classesDeVignette()

  it('trouve bien les surfaces qui affichent une vignette', () => {
    // Garde-fou du test lui-meme : s'il ne trouve plus rien — balise reecrite,
    // `className` passe autrement — il passerait a vide en donnant l'illusion
    // de proteger quelque chose.
    expect(classes.length).toBeGreaterThanOrEqual(5)
    expect(classes).toContain('fiche-image')
  })

  it.each([
    ['width', /^\s*width\s*:/m],
    ['max-width', /^\s*max-width\s*:/m],
    ['min-width', /^\s*min-width\s*:/m],
  ])('n’est jamais contredite par un %s chez un appelant', (propriete, motif) => {
    const fautifs: string[] = []

    for (const chemin of fichiers('.css')) {
      const source = fs.readFileSync(chemin, 'utf8')

      for (const classe of classes) {
        // Le corps de la regle qui vise EXACTEMENT cette classe, commentaires
        // retires : une propriete citee dans une explication n'est pas un bug.
        for (const bloc of source.match(new RegExp(`\\.${classe}\\s*\\{([^}]*)\\}`, 'g')) ?? []) {
          const corps = bloc.replace(/\/\*[\s\S]*?\*\//g, '')
          if (motif.test(corps)) fautifs.push(`${path.basename(chemin)} → .${classe}`)
        }
      }
    }

    // Le message porte le remede, pas seulement le grief : qui lira cet echec
    // dans six mois n'aura pas le contexte en tete.
    expect(
      fautifs,
      `Ces regles declarent un \`${propriete}\` sur une vignette et se battront ` +
        `avec \`.image-position\` a egalite de priorite. Pose plutot ` +
        `\`--image-position-taille: min(100%, …)\`.`,
    ).toEqual([])
  })
})
