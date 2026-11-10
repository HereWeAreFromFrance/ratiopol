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

**Complément — « La France en chiffres » sur l'accueil (même jour).** Une
section compacte entre le héros et les idées : la courbe d'évolution
2021-2025 en version réduite (seules les bornes 2021/2025 sont étiquetées —
tous les points restent tracés, la version complète reste sur /reperes) et
trois cartes chiffrées cliquables vers /reperes. Accroche d'invitation à
contribuer, neutre par construction : elle intrigue, elle ne commente pas.
Tous les chiffres viennent des mêmes constantes de `reperes.ts` — aucune
valeur recopiée, donc couverte par le test de cohérence. La feuille de
données de graphiques est renommée `/reperes.css` → **`/graphiques.css`**
(générique : l'accueil et /reperes la partagent — le journal plus haut
mentionne l'ancien nom, c'était celui du jour de la décision).

## 2026-11-10 — Grands écrans : la page s'élargit par paliers

Paul : « sur un écran 4K c'est mal utilisé ». Tout plafonnait à
`--r-largeur-page: 72rem` (1152 px) — un tiers d'un 4K. Deux paliers
redéfinissent ce jeton sur `:root` (`jetons.css`) : ≥ 120rem de viewport
→ 90rem de conteneur, ≥ 160rem → 120rem, soit 75 % des viewports CSS
réels d'un 4K (échelle OS 150/200 %) ou d'un 27″ 5K. `page.css` suit :
listes de postes en trois colonnes au premier palier, camembert agrandi
(`--r-came-max-large`) mais bloc contenu (`--r-came-bloc-max`), courbe
plafonnée (`--r-courbe-max`). En dessous de 120rem, rien ne bouge.

Choix argumentés (vérifiés par le contrôle indépendant) : pas
d'agrandissement de la police racine — le `ch` échelonne avec elle, la
mesure de lecture suivrait ; la taille du texte reste une affaire d'échelle
OS et de zoom, par utilisateur. Pas de palier au-delà de 160rem : un
viewport 3840 CSS n'existe qu'à échelle OS 100 %, où l'on zoome de toute
façon (à 150 % on retombe au palier 2560). On élargit la mise en page,
jamais la mesure du texte.

## 2026-11-10 — Courbes : couleurs honnêtes et simulateur « votre hypothèse 2026 »

Paul : « vérifie que mes couleurs correspondent bien aux courbes ; on doit
pouvoir faire bouger les courbes soi-même et voir les effets produits. »

**Le contrôle a trouvé un vrai décalage** : la pastille « Recettes publiques »
de la légende de courbe était bleue — elle réutilisait `rcc-r0`, classe du
camembert des recettes où le 1er poste prend la série 1 — alors que son trait
est orange (série 2). Les pastilles de courbe ont désormais des classes
dédicées (`rcc-courbe-d/r`) alignées sur les traits ; les classes camembert
restent intactes ; un test verrouille la correspondance.

**Le simulateur**, sur /reperes : les séries officielles 2021-2025 restent
figées (l'histoire ne se déplace pas) ; deux poignées clavier/souris/tactile
posent l'hypothèse 2026 (dépenses et recettes, % du PIB, bornes 50-60) et une
bande de résultats recalcule le solde simulé (% PIB et Md€) et l'écart avec
2025 en points. Règles d'objectivité de la simulation : arithmétique pure —
aucun adjectif, aucune couleur sémantique, pas de « améliore/dégrade » ; la
note dit que ce n'est ni une prévision ni les chiffres officiels ; le PIB
2025 déduit des comptes publiés est la seule grandeur calculée, il vient des
constantes de `reperes.ts` en data-attribute (zéro valeur recopiée en JS).
Sans JavaScript : graphe et bande de résultats au statu quo 2025, rendus par
le serveur, identiques au codepoint près à la réécriture du JS.

**Complément (même jour)** : le simulateur passe aussi sur l'accueil
(courbe compacte « La France en chiffres ») — même moteur, mêmes data-* :
le JS du simulateur n'a pas eu une ligne à changer. Les trois cartes
chiffrées de l'accueil restent les chiffres officiels 2025 et ne bougent
jamais avec la simulation ; un test verrouille la coexistence des deux
figures (151,6 Md€ publiés ≠ −152,6 Md€ simulés, tous deux visibles).
Pendant le glissement, le % suivi s'affiche sur le graphe à côté de la
poignée (visible au focus, retiré au blur — piloté par CSS, pas par JS) ;
le chiffre et l'unité, rien d'autre.
