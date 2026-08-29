# PRD Quality Review — Passe Finder v2

## Overall verdict
PRD solide, cohérent et honnête sur son scope, bien calibré pour un outil interne à faible enjeu avec une vraie dimension UX (élèves sur mobile). La thèse (modèle composable Position/Passe/Enchaînement → publication en 5 min) est claire et gouverne les features. Les principaux risques sont mécaniques (numérotation des FR non contiguë) et quelques exigences adjectivales acceptables pour l'enjeu mais imprécises pour le passage aux stories.

## Decision-readiness — strong
Les décisions sont posées comme telles, pas noyées. Trade-offs nommés : FR-8 (suppression bloquée) protège explicitement les révisions élèves ; FR-24 délègue l'auth à l'Architecture en assumant le choix ; FR-33 rattache tout à Alain plutôt que migrer 50 comptes. §9 liste de vraies questions ouvertes, chacune avec propriétaire et jalon. Aucune n'est rhétorique.

## Substance over theater — strong
Pas de persona theater : 3 rôles, chacun pilote des permissions réelles. Le différenciateur (composition guidée par le graphe, encadré dans UJ-1) est issu de la découverte, pas du template. Vision spécifique au produit (vidéo/chapitrage, synonymes par école).

## Strategic coherence — strong
Thèse explicite en §1. Priorisation des features suit la thèse (le moteur est le cœur, le reste sert la boucle compo→partage→révision). Contre-métriques présentes et pertinentes (CM-1 maintenance = cause d'abandon des v1/v2 ; CM-2 friction du geste central).

## Done-ness clarity — adequate
La plupart des FR ont une conséquence testable. Quelques exigences reposent sur des adjectifs :
- **FR-12 / FR-19** « vue claire de la chaîne », « autres infos utiles » au survol — imprécis, mais la forme est explicitement déléguée à l'UX (Q-5). Acceptable.
- **NFR-2/3/4/5** « quelques minutes », « légers », « fiable », « disponibilité correcte » — pas de seuils chiffrés. Acceptable pour l'enjeu interne ; à border si on veut des critères d'acceptation durs.

### Findings
- **low** NFR adjectivales (§5) — pas de seuils. *Fix :* acceptable en l'état ; ajouter des ordres de grandeur si besoin en phase stories.

## Scope honesty — strong
§8 exemplaire : hors-scope repris du brief **et** ajouté pendant le PRD, chaque dé-scope explicite. Aucun tag `[HYPOTHÈSE]` résiduel (tous levés). Densité d'items ouverts faible et cohérente avec l'enjeu.

## Downstream usability — adequate
Noms de domaine (Position, Passe, Enchaînement, favori, partagé) employés de façon cohérente. UJ tous dotés d'un protagoniste nommé. **Point mécanique réel** : les IDs de FR ne sont pas contigus dans l'ordre de lecture (F3 : FR-17→21 puis FR-41/42/43 puis FR-22 ; FR-40 vit en §7). Tous les IDs résolvent et sont uniques, mais l'ordre gêne la lecture et le sourcing des stories.

### Findings
- **medium** Numérotation FR non contiguë (§4/§7) — FR-41/42/43 insérés au milieu de F3 ; FR-22 après ; FR-40 en §7. *Fix :* renuméroter les FR dans l'ordre de lecture (rien d'externe ne les référence encore).
- **low** Redondance FR-16 / FR-34 (URL YouTube sur enchaînement, énoncée deux fois) — FR-16 est un pointeur vers F6. *Fix :* garder FR-16 comme simple renvoi ou fusionner.

## Shape fit — strong
Outil interne mais avec UX réelle (élèves sur mobile) → les UJ sont justifiés, pas de la sur-formalisation. Longueur proportionnée.

## Mechanical notes
- Numérotation FR : voir finding medium ci-dessus.
- Pas de section Glossaire dédiée ; les définitions de §1 suffisent à cet enjeu.
- FR-16 renvoie à F6 ; cohérent.
- Cross-références (§8, F5, F6, Q-x) résolvent toutes.
