# Kit d'éléments pour composer des schémas de position

> **Le site fait maintenant ce travail lui-même.** Va dans **Composer une
> position** (le « + » de la barre, ou `/positions/nouvelle`) : tu poses les
> pièces, tu les déplaces, tu les tournes, et l'image part directement dans la
> position — plus besoin de Paint ni de découpage. Ce kit reste là pour
> travailler hors du site, ou pour glisser un schéma dans un autre document.

Les pièces ont été redessinées en vectoriel à partir des images de
`images/positions/`, en relevant les couleurs et les proportions exactes des
originaux. Elles sont exportées en **PNG à fond transparent**, prêtes à être
empilées dans Paint, paint.net, Paint 3D, PowerPoint, Canva…

## Le principe : un repère commun

Chaque pièce est dessinée sur un carré transparent de **800 × 800 px** dont le
**centre correspond au centre de la tête**. Conséquence pratique :

> Si vous collez deux pièces exactement au même endroit, elles s'emboîtent
> toutes seules. Pas de réglage au pixel près.

La tête fait 200 px de diamètre, soit un peu plus de 3 fois la taille des
schémas d'origine (63 px). Réduisez la composition finale à la fin si besoin.

## Ordre de collage

1. le fond vert (`fonds/`) ;
2. les **bras gris** — ceux qui passent *en dessous* ;
3. les **bras noirs** — ceux qui passent *au-dessus* ;
4. les **têtes**, en dernier : elles masquent le départ des bras, qui semblent
   ainsi sortir de derrière le corps.

## Contenu

| Dossier | Ce qu'il contient |
| --- | --- |
| `tetes/` | `tete-homme-XXX.png` et `tete-cavaliere-XXX.png`, où `XXX` est l'orientation en degrés (0 à 330 par pas de 30). Plus les deux têtes nues, sans éclair ni queue de cheval. |
| `bras/` | `bras-<longueur>-<couleur>-<sens>-XXX.png`. Longueur : `court`, `moyen`, `long`. Couleur : `noir` (passe au-dessus), `gris` (passe en dessous). Sens : `horaire` ou `antihoraire` — le côté vers lequel le bras s'enroule. `XXX` : l'endroit de la tête d'où part le bras. La main est déjà au bout. |
| `accessoires/` | L'éclair seul et la queue de cheval seule, aux 12 orientations, à poser sur une tête nue. Plus `main.png`, une main isolée (petite image, à placer librement). |
| `fonds/` | Rectangles verts vierges en trois tailles. |
| `planches/` | Les planches de contact : toutes les pièces côte à côte avec leur nom, pour repérer d'un coup d'œil celle qu'il vous faut. Plus `exemple-composition.png`, un montage fait uniquement avec des pièces du kit. |

Au total 195 pièces (24 têtes, 144 bras, 25 accessoires, 2 têtes nues).

## Palette (relevée sur les originaux)

| Élément | Code |
| --- | --- |
| Fond | `#CCFFCC` |
| Tête du cavalier | `#B9E0E5` |
| Tête de la cavalière | `#FF99CC` |
| Queue de cheval / étoile | `#FFFF00` |
| Mains | `#FFFFFF` |
| Contours et bras au-dessus | `#000000` |
| Bras en dessous | `#808080` |

## Cas particulier : Paint « classique »

Paint gère mal la transparence des PNG. Deux solutions :

- **la plus simple** : ouvrir une planche de `planches/`, sélectionner une pièce
  au lasso rectangulaire, la copier, puis la coller dans votre dessin en
  activant **Sélection ▸ Sélection transparente** (le vert du fond devient alors
  transparent, à condition que le vert soit la couleur d'arrière-plan) ;
- **la plus confortable** : utiliser [paint.net](https://www.getpaint.net/) ou
  Paint 3D, qui respectent la transparence et permettent aussi la rotation libre
  si aucune des 12 orientations fournies ne convient.

## Régénérer ou modifier le kit

```bash
npm run generer:kit
```

**La géométrie n'est plus dans ce script.** Les formes, les couleurs et les
proportions vivent dans `src/dessin-position.ts`, d'où l'atelier du site les
prend aussi — une seule source, donc aucun risque que les deux divergent.
`scripts/generer-kit.ts` ne garde que sa mise en page : une pièce par fichier,
et les planches de contact.

Pour changer un contour ou une couleur, c'est donc `src/dessin-position.ts`
qu'il faut modifier ; le kit et le site suivront ensemble.

Une planche de comparaison, utile pour arbitrer la taille des personnages :

```bash
npm run planche:comparaison
```
