---
name: Passe Finder v2 — Lin & Sauge
description: Identité visuelle épurée d'un catalogue de danse ; décor neutre et calme, accent vert sauge, pour laisser ressortir les images colorées des positions.
status: final
created: 2026-07-21
updated: 2026-07-21
colors:
  bg: '#F6F7F3'
  surface: '#FFFFFF'
  surface-container: '#F0F2EC'
  ink: '#202519'
  muted: '#5E6553'
  line: '#E3E7DD'
  accent: '#5E8A5A'
  accent-soft: '#E6EFE0'
  on-accent: '#FFFFFF'
  danger: '#B4432E'
  pos-bg: '#DCEBD9'
  dancer-lead: '#A9C7E6'
  dancer-follow: '#F2B5CF'
  bg-dark: '#14170F'
  surface-dark: '#1D211A'
  surface-container-dark: '#242A20'
  ink-dark: '#E9EEE2'
  muted-dark: '#A8B0A0'
  line-dark: '#2B3026'
  accent-dark: '#8FBE8A'
  accent-soft-dark: '#22301F'
  on-accent-dark: '#14170F'
typography:
  display:
    fontFamily: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif
    fontSize: 30px
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: -0.01em
  headline:
    fontFamily: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.25'
  body:
    fontFamily: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.55'
  label-caps:
    fontFamily: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.08em
  data:
    fontFamily: ui-monospace, "SF Mono", "Cascadia Code", Consolas, monospace
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.4rem
  DEFAULT: 0.55rem
  md: 0.7rem
  lg: 0.85rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 24px
components:
  button-primary:
    background: '{colors.accent}'
    color: '{colors.on-accent}'
    radius: '{rounded.md}'
    fontWeight: '700'
  button-ghost:
    background: '{colors.surface}'
    border: '1px solid {colors.line}'
    color: '{colors.muted}'
    radius: '{rounded.md}'
  position-image:
    background: '{colors.pos-bg}'
    radius: '{rounded.full}'
    note: 'Vue schématique de dessus ; danseur = {colors.dancer-lead}, danseuse = {colors.dancer-follow}'
  passe-arrow:
    color: '{colors.accent}'
    label: '{typography.label-caps}'
  chip-passe:
    background: '{colors.surface}'
    border: '1px solid {colors.line}'
    hover-background: '{colors.accent-soft}'
    hover-border: '{colors.accent}'
    radius: '{rounded.md}'
---

## Brand & Style

Passe Finder est un **outil**, pas une vitrine — l'esthétique est **épurée, sobre mais soignée**, jamais chargée de clichés « danse ». Le style est un **minimalisme calme** : décor neutre lin/sauge, généreux en respiration, où **la couleur vient des images de positions** (schémas colorés du couple) plutôt que du chrome de l'interface. Le ton est celui d'un carnet de travail clair et rassurant : on doit pouvoir composer un enchaînement en cinq minutes sans se sentir dans un logiciel intimidant.

## Colors

Le décor est volontairement **désaturé** pour que les schémas de positions ressortent.
- **Fond `#F6F7F3`** (lin) — canvas doux, non clinique.
- **Surface `#FFFFFF`** — cartes, rails, formulaires.
- **Encre `#202519`** / **Atténué `#5E6553`** — texte principal / secondaire, sur base vert-gris chaude (choisie, pas un gris pur).
- **Accent sauge `#5E8A5A`** — un seul accent : boutons primaires, flèches de passe, focus, liens actifs. Jamais pour de grandes surfaces.
- **Accent doux `#E6EFE0`** — survols, état sélectionné, position verrouillée.
- **Danger `#B4432E`** — uniquement suppressions/erreurs.
- **Couleurs danseurs** — `dancer-lead #A9C7E6` (danseur) et `dancer-follow #F2B5CF` (danseuse) : convention de lecture stable des images de positions, réutilisée partout où on symbolise le couple.

Mode sombre via tokens `-dark` : même logique, accent `#8FBE8A` lisible sur fond `#14170F`. Les deux thèmes reçoivent le même soin ; le thème suit l'OS et le sélecteur du lecteur (`data-theme`).

## Typography

Tout en **sans-serif système** (aucune police externe — chargement instantané, zéro dépendance) : la hiérarchie se fait par **taille et graisse**, pas par un mélange de familles. Titres en gras (`display`/`headline`), corps en régulier (`body`), petits libellés en capitales espacées (`label-caps`), et **monospace** (`data`) réservé aux données alignées (dates, comptages). Si un supplément de caractère est souhaité plus tard, une police d'affichage dédiée pourra être intégrée en `@font-face` sans toucher au reste.

## Layout & Spacing

Grille souple, unité de base **4px**. Marges **16px sur mobile**, **24px sur desktop**. Le contenu de lecture reste confortable sur petit écran (les élèves lisent au téléphone). Les listes et fiches privilégient des **cartes** aérées sur `surface` posées sur `bg`.

## Shapes

Coins **doux** (`0.55rem` par défaut, `0.85rem` pour les grandes cartes) — ni angles durs (trop austères) ni pilules (trop « tech »). **Les images de positions sont rondes** (`full`), fidèles au schéma de dessus du couple. Les images suivent toujours le rayon de leur conteneur pour un rendu « encadré » cohérent.

## Components

- **Bouton primaire** — fond sauge plein, texte blanc, coins `md`. Un seul par zone d'action (ex. « Enregistrer »).
- **Bouton fantôme** — surface blanche, bordure `line`, texte atténué (ex. « ↶ Annuler dernière »).
- **Image de position** — ronde, fond `pos-bg`, schéma du couple (`dancer-lead`/`dancer-follow`). Nom de la position en texte alternatif ; placeholder `no_position` si absente.
- **Flèche de passe** — trait + tête en accent sauge, **portant le nom de la passe** en `label-caps`. Au retour à la ligne du zigzag, la flèche est **coudée** (en angle), jamais un simple trait vertical.
- **Chip / ligne de passe** (rail des passes possibles) — surface blanche, bordure `line` ; au survol, fond `accent-soft` + bordure `accent`. Affiche la passe et sa position d'arrivée (`→ ouverte`).
- **Position verrouillée** — fond `accent-soft`, coche discrète, pour signaler la position de départ figée.

## Do's and Don'ts

- **Do** garder le chrome neutre : l'accent sauge par petites touches, la couleur vient des images.
- **Do** un seul accent ; les couleurs danseurs ne servent qu'à symboliser le couple, pas d'accent décoratif.
- **Don't** jamais deux images de positions adjacentes sans flèche-passe entre elles.
- **Don't** pas de dégradés tape-à-l'œil, pas de motifs « danse », pas d'emoji comme repères de section.
- **Don't** ne pas utiliser le rouge `danger` ailleurs que pour supprimer/erreur.
