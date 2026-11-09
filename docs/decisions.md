# Journal des décisions

## 2026-11-08 — Stratégie « l'outil d'abord » (tool-first)

**Décision de Paul** : pour le moment, personne d'autre n'est mis à
contribution (pas d'entretiens de validation, pas de démarche auprès d'élus
ou d'assistants parlementaires). Objectif : un **superbe site**, un très bon
outil **gratuit** ; les gens viendront et interviendront s'ils le veulent.

**Conséquences sur le design** :
- Le site doit être utile **en autarcie** : la valeur ne peut pas dépendre de
  la présence d'élus (le tableau de suivi élus ↔ idées devient une phase
  ultérieure, optionnelle, alimentée quand des réponses existent).
- La qualité perçue (esthétique, vitesse, simplicité mobile, fiabilité)
  devient le principal argument d'adoption — c'est le produit.
- La bouche-oreille et le partage (URL propres par idée, pages publiques
  indexables, SEO propre) remplacent la démarche de validation.
- Les garde-fous juridiques restent intégres dès le premier jour (modération,
  RGPD art. 9, LCEN) — « petit site » ne suspend pas la loi, et l'effet
  d'entraînement attendu suppose d'être irréprochable.

**Risque assumé, noté une fois pour toutes** : « build it and they will
come » est le piège classique des civic tech (cf. doc 02). Si après quelques
mois aucune contribution organique n'arrive, la décision pourra être
réexaminée — sans que ça remette en cause la suite du développement.

**Choix technique concomitant** (doc 05) : développement sur mesure, léger,
hébergé sur le VPS existant.

## 2026-11-09 — Page « Repères » : les chiffres officiels, sans commentaire

**Décision de Paul** : donner aux visiteurs un contenu objectif d'emblée —
les chiffres des finances publiques françaises — pour aider à écrire des
idées concrètes, surtout leur arbitrage.

**La page `/reperes`** (`serveur/reperes.ts` + `rendu.pageReperes`) :
- le budget de l'État (LFI 2026, loi n° 2026-103 du 19/02/2026) : dépenses
  par mission, recettes par impôt, solde, emplois autorisés ;
- les finances publiques complètes (Insee) : dépenses/recettes des
  administrations publiques et sous-secteurs (État, Sécurité sociale,
  collectivités, ODAC), déficit 2025, dette au 30/06/2026.

**Les règles d'objectivité** (ce qui distingue des « chiffres pour appuyer
une opinion ») :
1. **Un chiffre = une source officielle nommée + un millésime.** Jamais de
   chiffre nu. Les sources sont liées en bas de page.
2. **Zéro commentaire.** Aucun adjectif, aucun « c'est beaucoup/trop peu »,
   aucune conclusion. Les chiffres parlent, le visiteur conclut.
3. **Aucun biais de sélection.** Les postes principaux ET le total, avec une
   ligne « autres » exacte — rien n'est soigneusement omis. Les sous-secteurs
   qui se chevauchent portent une note de méthode plutôt qu'un pourcentage
   trompeur.
4. **Mise à jour à la main, une fois par an**, quand la loi de finances de
   l'année est promulguée. Le test « les repères budgétaires restent
   cohérents » vérifie que les parts tiennent dans les totaux : s'il saute
   après une mise à jour, un montant a été mal recopié.

**Conséquences sur le design** : barres proportionnelles en pur CSS (aucune
image, aucun JS, CSP intacte) ; la largeur d'une barre est une donnée
calculée côté serveur, pas un style. Renvois depuis le formulaire de dépôt
et le thème « Impôts & budget » pour fermer la boucle chiffres → idée.
Un encadré de repères par thème (logement, santé…) est envisagé en v2 —
chaque thème mériterait ses propres sources, plus lourd à maintenir.

**Complément du même jour — ergonomie et lignes cliquables.** La page est
refondue pour occuper l'espace : sortie de la colonne de 68ch, bandeau
« L'essentiel » (les quatre chiffres publics) en tête, dépenses/recettes en
deux colonnes sur grand écran, vérifiée de 320 px à 1440 px, clair et sombre
(captures multi-viewports dans `outils/capture.mjs`). **Chaque ligne de
poste est cliquable** vers sa page de thème RatioPol — c'est un choix
éditorial de Paul : le chiffre mène vers l'avant (les idées du thème, puis
le dépôt), sans rien changer à l'objectivité des chiffres. Le mapping
(mission → thème) vit dans `serveur/reperes.ts` et est vérifié par le test
de cohérence ; les lignes de méthode (prélèvements, fonds de concours)
restent non cliquables. Constat accepté : les `@media` CSS ne peuvent pas
consommer de `var()` (limite du langage) — les breakpoints restent
littéraux, liés au jeton par commentaire. Un aller-retour ergonome ⇄
contrôleur a précédé la mise en ligne (contraste AA sur l'affordance
cliquable, jetons, note d'arrondi).

**Complément — vues graphiques et couleurs (même jour).** La page Repères
offre un **changement de type de graphique sans JavaScript** : onglets-liens
`?vue=barres` / `?vue=camembert` rendus côté serveur (vue inconnue →
barres), et une section fixe « Évolution (2021-2025) » tracée en **SVG
inline** — la seule vraie série temporelle (`ÉVOLUTION`, dépenses/recettes
publiques en % du PIB, même source Insee), les missions d'une même année ne
se tracent pas en courbe. Une **palette de six jetons** (`--r-serie-1..6` +
neutre « reste », clair et sombre, mécanisme de daltonisme commenté) colore
les parts du camembert et les deux lignes de la courbe ; la couleur ne porte
jamais l'information seule (légendes textuelles partout). Pas de pourcentage
sur les sous-secteurs : ils se chevauchent, la note de méthode l'explique.

**Découverte d'architecture** : la CSP (`default-src 'self'`, sans
`style-src`) **bloque les attributs `style` inline** — les largeurs de
barres de la première mise en ligne n'ont jamais été appliquées (toutes à
100 %). Règle qui en découle : **les données de graphique vivent dans une
feuille CSS générée côté serveur** (`/reperes.css`, même-origine, calculée
une fois) — jamais d'inline, jamais d'`unsafe-inline`, jamais de JS. La CSP
du site reste intouchée. (Rappel pour une future passe : quelques styles
inline historiques hors page Repères — page idée, table admin — sont
également bloqués, décoratif.)
