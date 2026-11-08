# 05 — Choix de la plateforme technique

*Question posée nov. 2026 : « on pourra mettre tout ça sur le site. Tu conseilles quoi comme plateforme ? MediaWiki ? »*

## 0. Rappel des besoins (issus des docs 03-04)

1. Formulaire « idée structurée » imposé (problème → proposition → bénéficiaires
   → arbitrage → indicateur), avec refus assisté des contributions hors gabarit.
2. Vote « une personne une voix » : vérification (FranceConnect/France
   Identité) → jeton anonyme décorrélé.
3. Vue « clusters d'opinion » (mode Pol.is), pas de compteurs bruts.
4. Tableau public de suivi élus ↔ idées ↔ suites (boucle de retour).
5. Modération DSA : signalement, retrait rapide, recours, journal de
   transparence ; filtre anti-attaque de personne (diffamation art. 31).
6. RGPD art. 9 : opinions politiques = données sensibles → consentement
   explicite, minimisation, pas de profilage.
7. Pseudonymat d'affichage, identité conservée côté plateforme (LCEN).

## 1. MediaWiki : non

Optimisé pour l'édition collaborative de textes neutres (Wikipédia) :
articles, historique de révisions, consensus par discussion.

| Besoin | MediaWiki |
|---|---|
| Gabarit imposé | Pages libres ; formulaires seulement via extensions bricolées |
| Vote vérifié / jeton | Extensions de vote basiques, aucune vérification décorrélée |
| Modération DSA | Rien d'intégré |
| Tableau de suivi élus | N'existe pas |
| RGPD art. 9 | Conçu pour données publiques universelles |

Un wiki finirait en cimetière de pages non structurées — le contraire du
différenciateur « idées actionnables ».

Usage complémentaire possible plus tard : socle documentaire neutre par
thème (dossiers « logement », « retraites »…) à la manière wikipédia —
jamais le cœur du site.

## 2. Options existantes

### Decidim (Barcelone, libre, Ruby on Rails) — le plus proche
- Propositions, commentaires, vérification des comptes, réunions, budgets
  participatifs.
- **Module Accountability natif** = notre boucle de retour : résultats liés
  aux propositions, statuts de progression, suivi public commentable
  (docs.decidim.org/en/develop/admin/components/accountability.html).
- Champs personnalisés des formulaires de proposition (depuis 0.28) → le
  gabarit est approximativement faisable.
- API GraphQL, multi-langue, accessible (RGAA-ish), utilisé par de
  nombreuses collectivités françaises.
- Revers : application lourde à opérer (Rails + Sidekiq + PostgreSQL),
  personnalisation profonde en Ruby, esthétique « plateforme municipale »,
  et les quatre différenciateurs (gabarit strict, jeton, clusters, tableau
  de suivi élus) restent à écrire soit-même dedans.

### Consul Democracy (Madrid, libre, Rails)
- Même famille que Decidim, axé propositions/votes.
- Précédent Decide Madrid 2016 (bourrage de propositions par faux soutiens) :
  la vérification reste de notre charge quoi qu'il arrive.

### Pol.is (libre)
- Parfait pour la vue clusters d'opinion ; mais ce n'est qu'un module de
  conversation : pas de comptes, pas de suivi, pas de gabarit.
- À intégrer comme brique, pas à utiliser seul.

### LiquidFeedback (libre)
- Démocratie liquide (délégation de vote thématique). Intéressant plus tard,
  hors périmètre du MVP ; complexité conceptuelle élevée pour le grand public.

### Drupal + modules participation
- Faisable mais vieillissant pour ce cas d'usage ; autant de travail custom
  que le custom, avec la dette d'un CMS.

## 3. Développement sur mesure

Le cœur du MVP n'est que : formulaires + votes + pages publiques + file de
modération. Contraintes maîtrisées ici (VPS nginx existant qui sert déjà
Miliad/Lumilap ; stack connue).

- Avantages : fidélité exacte aux quatre différenciateurs ; RGPD art. 9 par
  conception (minimisation native, pas de tables inutiles) ; pas de lutte
  contre un framework ; code open source = argument de gouvernance.
- Inconvénients : tout écrire (auth, modération, admin, i18n, accessibilité) ;
  crédibilité « outil éprouvé » moindre au lancement face aux institutions.

## 4. Recommandation

**Étape immédiate (indépendante du choix)** : prototype du formulaire
« idée structurée » en page statique, pour les entretiens de validation.
Aucune plateforme ne sert à rien sans réponses d'élus en main.

**Ensuite, deux chemins selon la priorité :**

| Priorité | Choix |
|---|---|
| Vitesse + crédibilité institutionnelle ; gabarit souple | **Decidim** (+ Pol.is greffé pour les clusters) |
| Fidélité aux différenciateurs (gabarit strict, jeton, tableau, modération DSA) | **Custom** — ces quatre éléments sont précisément ce que Decidim n'a pas, et les y ajouter revient souvent à lutter contre la plateforme |

Pente recommandée : prototype statique → entretiens → si « custom » :
MVP monolithique étroit (doc 04 §5), hébergé sur le VPS existant, avec
Decidim gardé en plan B si le besoin d'une « grosse » plateforme apparaît
(partenariat avec une collectivité, par exemple).
