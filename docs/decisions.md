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

## 2026-11-11 — Des données plus utiles à la décision

Paul : « prendre plus de données pour permettre des décisions plus
rationnelles ». Principe retenu : **plus de données sur les idées, pas sur
les personnes** (RGPD art. 9). Trois chantiers validés par Paul.

**1. Mesurer juste avant de mesurer plus.**
- Le soutien était dédoublonné par `sha256(jour|sel|ip)` : la même personne
  pouvait re-soutenir la même idée chaque jour. Les avis utilisent
  désormais `sha256(avis|sel|slug|ip)` (`securite.empreinteAvis`) : **pas
  de jour** (un avis par idée et par adresse, modifiable), et **le slug dans
  le hachage** — l'empreinte change d'une idée à l'autre, on ne peut pas
  relier les avis d'une même personne ni reconstituer ses opinions. Limite
  assumée : une adresse partagée (foyer, bureau, CGNAT) ne compte qu'une
  fois ; le décompte reste « indicatif ». L'empreinte du jour reste pour le
  rythme et la trace LCEN du dépôt.
- L'e-mail du formulaire était validé puis **jamais stocké** (la promesse
  « être contacté » ne pouvait pas être tenue). Supprimé du formulaire, du
  gabarit et de la base (colonne toujours NULL) : minimisation.
- La recherche lit maintenant les six champs (bénéficiaires, arbitrage et
  indicateur compris).

**2. L'impact chiffré, optionnel (évolution du gabarit).** Trois champs :
effet sur les finances publiques (coûte / rapporte / neutre), montant
annuel estimé (k€, M€, Md€ ; plafond 2 000 Md€ = faute de frappe), poste
budgétaire touché (liste `POSTES_CIBLES` tirée des Repères, avec des **ids
stables** à ne jamais renommer à la mise à jour annuelle). **Optionnel** :
la concrétude reste exigée par les cinq champs ; seule la **cohérence** est
exigée (un montant dit s'il coûte ou rapporte). La page idée rapporte le
montant au chiffre officiel du poste (« soit 5,0 % du montant de ce
poste ») avec la source et le millésime du dénominateur, la mention
« estimation de l'auteur, non vérifiée », aucun adjectif — les règles
d'objectivité des Repères. Une idée non chiffrée le dit, sans plus.

**3. Des avis plus riches qu'un « je soutiens ».** Deux questions
**indépendantes** : sur le fond (d'accord / pas d'accord / sans avis) et
sur l'arbitrage (exposé de façon complète / partielle / incomplète) — on
peut juger un arbitrage honnête sans partager l'idée, c'est la mission du
site. Aucune couleur de jugement (« pas d'accord » a l'allure de
« d'accord »). Le bouton de l'avis déjà donné depuis cette adresse est
enfoncé (`aria-pressed`) : on voit qu'on peut changer d'avis, sans compte
ni cookie. Formulaires natifs sans JS ; `/soutien` reste une porte (pages
en cache) qui vaut « d'accord ». Le tri « soutenues » devient « le plus de
d'accord ».

**Migration 002** : `soutiens` → `avis` (les soutiens existants deviennent
des « d'accord » ; leur empreinte du jour n'étant pas reconnue par la
nouvelle, un visiteur déjà venu pourra compter une fois de plus, une seule
— accepté plutôt que de jeter des soutiens réels), colonnes d'impact,
`email` supprimée. Éprouvée sur un PostgreSQL jetable avec des données
001. Au passage, `DepotPg` est exporté du bundle : `test/pg.test.mjs`
n'avait jamais pu tourner (« DepotPg is not a constructor »).

**Écartés, notés une fois** : âge, CSP ou vote des contributeurs (fichier
sensible pour une représentativité de toute façon illusoire) ; clusters
d'opinion à la Pol.is, qui exigent de relier les votes d'une personne —
pas avant le jeton anonyme vérifié et un avis juridique (doc 04 §3).

## 2026-11-11 — Thèmes : exhaustifs, rangés en familles

Paul : « plusieurs thèmes, par exemple budget, écologie, énergie, service
public, IA… exhaustif et en même temps attrayant ». De 12 thèmes à **25 +
« Autre »**, en **six familles** (Au quotidien · Apprendre & travailler ·
Vivre ensemble · Planète & territoires · L'État & la démocratie ·
Numérique). La liste est calée sur les missions du budget de l'État :
chaque poste des Repères mène à un thème précis (Défense → Europe, défense
& monde ; Justice → Justice ; Cohésion des territoires, qui est surtout
des aides au logement → Logement…). Le test des Repères le vérifie.

**Exhaustif et attrayant à la fois** : chaque thème porte une **accroche**
de sujets concrets (« Loyers, construction, rénovation… »), on reconnaît
le sien sans lire 26 lignes. La page /themes présente des cartes par
famille, le formulaire un menu en `optgroup` par famille, et chaque page
de thème montre son accroche et **ses chiffres officiels** (les postes des
Repères qui y mènent, avec source et millésime). Les accroches énumèrent
des sujets, jamais une position (« nucléaire, renouvelables », pas
« sortir du nucléaire »).

**Ids stables** : stockés avec les idées, jamais renommés. Les douze
anciens existent toujours (un test le vérifie) ; `impots` s'affiche
désormais « Budget & impôts », `territoires` perd l'agriculture, qui a
son propre thème. Aucune idée n'était publiée : rien à migrer.

## 2026-11-11 — Fiches « pour agir » : les faits de chaque thème

Paul : « dans chaque thème, ramener un maximum d'informations objectives
pour savoir comment agir ». Chaque thème a désormais une fiche
(`serveur/fiches.json`, typée par `serveur/fiches.ts`) :
- **Les chiffres clés** (240 au total, 5 à 11 par thème) : ampleur,
  évolution, argent public, comparaison européenne quand elle est
  officielle ;
- **Qui décide** : UE, État, Parlement, région, département,
  intercommunalité, commune, Sécurité sociale, partenaires sociaux — savoir
  à qui s'adresser est la première condition pour agir ;
- **Pour aller plus loin** : rapports et portails officiels ;
- un bloc commun **« Comment agir »** (page `/agir`) : pétitions Assemblée,
  Sénat et CESE avec leurs seuils, RIP, droit de pétition local, députés et
  sénateurs, consultations et enquêtes publiques.

**Mêmes règles que les Repères**, et un garde-fou de plus : chaque chiffre
garde l'**extrait** de la page d'où il vient (non affiché) — la preuve
qu'on relit à la mise à jour. Le test « fiches » exige une URL https d'un
**domaine officiel** (liste fermée dans le test : un nouveau domaine se
justifie par écrit), tous les champs remplis, et refuse une liste de mots
de jugement (« record », « seulement », « alarmant »…) dans les libellés.

**Comment c'est fait** : recherche par cinq agents en parallèle, consigne
« uniquement des pages officielles réellement ouvertes, chiffres recopiés à
l'identique, aucun calcul, aucun chiffre de mémoire », puis relecture.
Retirés à la relecture : les comparaisons européennes sans la valeur
française ; une compétence dont la source ne disait pas ce qui était
écrit ; l'emploi des jeunes en informatique sur la fiche IA (il suggérait un
effet de l'IA que la source ne mesure pas) ; le déficit, la dette et la
dépense de la fiche Budget (compte Insee du 29 mai, 152,5 Md€, alors que les
Repères affichent les tableaux détaillés du 28 août, 151,6 Md€ — deux
millésimes officiels, on n'en affiche pas deux sur le site). Les montants 2026 issus
du projet de loi de finances le disent dans leur précision, comme la hausse
du tarif d'électricité, qui est une proposition de la CRE. Liens vérifiés
un par un : deux morts retirés ; douze refusent les robots (Légifrance,
Intérieur, Éducation) mais s'ouvrent dans un navigateur.

**Correction (12/11/2026)** : le 11/11 on a cru les Repères en retard sur
le compte de mai. C'est l'inverse : les tableaux détaillés de l'Insee du
28/08/2026 révisent le déficit 2025 de 152,5 à 151,6 Md€ ; les Repères sont
au dernier millésime et ne bougent pas. Seuls leurs libellés de source
étaient faux (« mars 2026 » pour le 28/08, « n° 323 » pour le n° 239). La
fiche Budget passe au tableau 3.106 d'août : le solde de la Sécurité
sociale y est de −5,8 Md€ (−6,7 en mars), et les trois soldes sont écrits
avec le même signe. **Règle** : avant de dire qu'un chiffre est périmé,
comparer les dates de parution, pas l'ordre de découverte.

**À reprendre** : plusieurs chiffres seront à rafraîchir à leur
prochaine édition (inflation définitive le 13/11/2026, enquête Sans
domicile fin 2026, participation aux municipales 2026, données Intérieur
bloquées aux robots).

## 2026-11-12 — « Votre budget » : le simulateur poste par poste

Paul : « donner plus de contenu objectif et permettre aux utilisateurs
d'interagir facilement, par exemple en bougeant les curseurs des budgets et
en voyant les conséquences. » Le simulateur d'hypothèse (deux poignées
globales sur la courbe) passe à l'étage au-dessus : **un curseur par poste
de la loi de finances**, page dédiée `/budget` (périmètre choisi par Paul :
dépenses **et** recettes de l'État ; les sous-secteurs APU se chevauchent,
les additionner serait trompeur — hors périmètre).

**La mécanique** : 14 missions + « Autres missions » en dépenses, 5
recettes fiscales nettes + les non fiscales en recettes — les constantes de
`reperes.ts`, rien de recopié (couvertes par le test de cohérence). Chaque
ligne : nom, montant de la loi, variation recalculée, barre proportionnelle
des Repères (même feuille `/graphiques.css`), curseur natif
`<input type="range">` de −100 % (suppression) à +100 % (doublement). La
bande de résultats recalcule : vos dépenses, vos recettes, votre solde,
l'écart avec la loi. Chaque ligne garde son lien de thème — le chiffre mène
à l'idée.

**L'arithmétique vit dans `serveur/budget.ts`, module pur sans I/O partagé
serveur et navigateur** (comme le gabarit avant lui) : sans JavaScript, le
formulaire se soumet en GET et le serveur re-rend la même page avec le même
calcul — curseurs repositionnés par `value`, inconnus ignorés, hors bornes
ramenés dedans (jamais de page cassée par un lien trafiqué). Avec
JavaScript (`web/budget.ts`), le recalcul est continu et le bouton
« Recalculer » disparaît (classe `bud-live`). Vérifié par capture : GET sans
JS et clavier avec JS rendent la même bande au caractère près
(Défense −50 %, IR +10 % → écart +43,2 Md€, solde −91,4 Md€).

**Les règles d'objectivité ne bougent pas** : le solde part du solde publié
(−134,6 Md€, tous budgets) et chaque point de curseur ajoute ou retire
exactement sa part du montant publié. La note de méthode le dit : aucun
effet économique n'est modélisé — doubler un impôt ne double pas forcément
son rendement, supprimer une mission n'économise pas mécaniquement son
montant. Les prélèvements aux collectivités et à l'UE ne sont pas des
curseurs : ce sont des transferts, pas des économies. Aucun adjectif, aucune
couleur de jugement dans les nombres.

**Croisements** : lien « Budget » dans la navigation, bouton sur l'accueil,
renvoi depuis les postes de /reperes, page dans le sitemap, appel final vers
/proposer (« le simulateur vous a déjà donné l'ordre de grandeur de
l'arbitrage »). Captures clair/sombre, 360/1440, sans JS et au clavier
(`captures/budget-*`).
