# 04 — Pistes produit : différenciateurs, anti-manipulation, gouvernance, MVP

## 1. Le format « idée structurée » — le cœur différenciant

Les plateformes existantes collectent des opinions. RatioPol doit **refuser
les opinions non actionnables** et forcer la formulation évaluable.

Gabarit proposé pour toute idée publiée :

1. **Problème constaté** — situation actuelle, avec si possible source/chiffre.
2. **Proposition** — ce qu'on change précisément (loi, règlement, pratique
   administrative), à quel niveau (commune, département, région, État, UE).
3. **Bénéficiaires** — qui gagne quoi.
4. **Arbitrage** — qui paie / qui perd quoi / quel coût d'ordre de grandeur.
5. **Indicateur de réussite** — comment on saurait que ça marche.

Règles de validation (refus automatique ou assisté) :
- pas d'attaque de personne (critique d'actes et d'idées, jamais de personnes —
  cf. risque diffamation, doc 03) ;
- proposition hors gabarit → renvoyée à l'auteur pour complétion (guidée) ;
- seuil minimal de concrétude : « il faut plus de justice » est refusé,
  « indexer X sur Y » est accepté.

L'intérêt : un assistant parlementaire ou un cabinet municipal peut réutiliser
directement un bloc (3)+(4) dans un amendement ou une délibération. **C'est la
valeur pour l'élu, donc le carburant de la boucle de retour.**

## 2. La boucle de retour mesurable — le différenciateur le plus défendable

Précédent : les e-pétitions britanniques (petition.parliament.uk) —
10 000 signatures → **réponse officielle obligatoire du gouvernement** ;
100 000 → la commission des pétitions *examine* un débat (pas garanti : sur
les 6 premières pétitions à 100 000, 2 seulement ont été débattues).
Leçon : des seuils qui déclenchent une **obligation**, pas une intention,
c'est ce qui crée la confiance — mais même obligationnée, la machine
institutionnelle filtre.

Pour RatioPol (pas institutionnel, on ne peut pas obliger l'État) :
- **tableau public de suivi** : par élu/région/thème — idées transmises,
  réponses reçues, délai moyen de réponse, suites documentées (question
  écrite, amendement, délibération, réponse ministérielle) ;
- transmission automatique par les canaux officiels existants (questions au
  gouvernement, pétitions AN/CESE, courriers aux cabinets) — RatioPol devient
  un **front-end citoyen des canaux officiels** plutôt qu'un concurrent
  fantôme ;
- le taux de réponse public crée une pression réputationnelle vertueuse :
  l'élu qui répond est mis en valeur (gamification positive, pas de
  naming-and-shaming brut).

## 3. Anonymat et intégrité : « une personne, une voix »

Le problème : empêcher un acteur de créer 500 comptes (astroturfing — cf.
crise Decide Madrid 2016, où des propositions citoyennes ont été bourrées de
faux soutien ; la littérature 2022-2025 montre bots + humains coordonnés,
détection difficile).

Architecture proposée, calquée sur le secret du vote électoral :
1. **Vérification décorrélée** : l'utilisateur prouve une fois qu'il est une
   personne physique distincte (via FranceConnect/France Identité — le
   système officiel, gratuit, éprouvé pour la procuration de vote en ligne)
   puis reçoit un **jeton anonyme non-lié** à son identité. La plateforme ne
   peut pas re-lier jeton ↔ identité ; chaque personne ne peut obtenir qu'un
   jeton par période.
2. **Le poids d'une idée n'est pas un compteur brut** : mode Pol.is — on
   publie des clusters d'opinion (« 3 groupes se dégagent, celui-ci est
   d'accord à 80 % avec celui-là sur ce point ») plutôt que des totaux de
   votes, ce qui rend l'astroturfing beaucoup moins rentable et la lecture
   plus honnête.
3. **Détection de coordination** : signaux simples (rafales temporelles,
   similarités de texte, graphes de co-vote) publiés dans un journal de
   transparence plutôt que cachés.
4. **Rythme limité** : plafond de contributions/jour par jeton, file
   d'attente de modération pour les nouveaux comptes.

Le pseudonymat reste l'affichage par défaut ; identité réelle connue de la
plateforme selon le cadre LCEN (doc 03 §1) — sauf si l'architecture
décorrélée est retenue pour la *participation*, auquel cas l'identification
LCEN s'applique à la *publication* (l'auteur d'une idée est identifiable par
la plateforme, pas les votes). À trancher avec un avocat avant l'écriture du
code.

## 4. Gouvernance et financement — la confiance avant la fonctionnalité

- **Structure** : association loi 1901 a priori (cohérence avec la
  neutralité ; gouvernance collégiale avec des personnalités de bords
  politiques différents).
- **Financement** : dons individuels + subventions publiques transparentes ;
  refus de partenariats payants orientant le contenu (l'erreur de Make.org).
  Publier les comptes.
- **Transparence algorithmique** : code open source, règles de tri publiées,
  journal des modérations (exigence DSA qui devient un argument de marque).
- **Pas de recommandation personnalisée** : aucune boucle d'engagement ; la
  navigation est thématique et locale (cohérent avec RGPD art. 9, doc 03 §4).

## 5. MVP proposé

Hypothèses à valider AVANT tout code (cf. doc 02 §5) : 20-30 entretiens
citoyens, 2-3 élus/assistants parlementaires.

Si validé, MVP volontairement étroit :

| Élément | Choix |
|---|---|
| Périmètre | **une verticale** (ex. logement) **ou** un territoire (1 département pilote) |
| Fonction 1 | Dépôt d'idées au format structuré (gabarit §1), avec aide à la complétion |
| Fonction 2 | Consultation/vote par jeton vérifié, vue « clusters » |
| Fonction 3 | Fiche publique par élu du territoire : idées transmises, réponses, suites |
| Modération | File humaine + filtres automatiques (attaque de personne, hors gabarit) ; journal public |
| Comptes | Pseudonymat ; vérification FranceConnect → jeton |
| Technique | Site statique + API + petite base ; hébergement UE ; pas de recommandation |

Critères de réussite à 6 mois : ≥ 500 idées conformes au gabarit, ≥ 3 élus ou
cabinets répondant réellement, ≥ 1 suite documentée dans un acte officiel
(question écrite, délibération). En dessous, la boucle n'est pas amorcée —
pivoter (autre verticale) ou arrêter.

## Sources complémentaires

- UK petitions : https://guidetoprocedure.parliament.uk/articles/t3rBvzV8/petitions-overview , https://www.gov.uk/government/... (cf. GDS « e-petitions: the first 100 days »)
- France Identité / procuration dématérialisée : https://france-identite.gouv.fr/actualite/procuration-de-vote-dematerialisee.html
- Astroturfing : https://www.actu-juridique.fr/ntic-numerique-medias-presse/fausses-foules-vraie-manipulation-lastroturfing-a-lheure-de-la-presidentielle
