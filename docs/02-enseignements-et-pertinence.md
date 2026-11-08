# 02 — Enseignements des précédents et pertinence du projet

## 1. Pourquoi les autres ont échoué ou plafonné

Le point de rupture est presque toujours le même, et ce n'est **pas** la
technologie :

1. **Le problème de l'œuf et de la poule élus/citoyens.** Sans élus engagés,
   les citoyens ne voient pas l'intérêt ; sans masse critique de citoyens, les
   élus ne viennent pas. Parlement & Citoyens en est mort doucement (actif
   2013-2020, quasi dormant depuis).
2. **L'impact non tenu.** La promesse « orienter la politique » exige que
   quelqu'un s'engage à *faire quelque chose* des contributions. vTaiwan
   s'est effondré quand le gouvernement a cessé de donner suite. Sans boucle
   de retour obligatoire et mesurable → « sondage glorifié », et les
   utilisateurs le sentent.
3. **La représentativité.** Les participants aux consultations sont un public
   très spécifique (urbain, diplômé, déjà politisé). Un élu peut légitimement
   ignorer un « consensus » issu de 0,1 % de sa circonscription.
4. **La modération, coût caché.** Un espace politique français anonyme attire
   immédiatement injures, diffamation, complotisme et manipulation organisée
   (astroturfing, bots — cf. crise Decide Madrid 2016). Voir 03-cadre-juridique.

## 2. Pertinence — évaluation honnête

### Ce qui joue contre
- Créneau encombré : l'État (Agora) et Make.org ont des moyens inatteignables
  pour un projet indépendant naissant.
- Taux d'échec très élevé du segment « faire entendre les citoyens aux
  décideurs », pour des raisons structurelles (les 4 points ci-dessus), pas
  par défaut d'exécution.
- Un espace politique en ligne est une cible de manipulation (partis, lobbies,
  États étrangers) proportionnée à sa visibilité.

### Ce qui joue pour — la case libre
Personne en France n'occupe : **espace citoyen indépendant + idées structurées
(pas des likes ni des pétitions vagues) + anonymat optionnel + interaction
traçable avec les élus en poste**.

1. **L'anonymat optionnel** n'existe nulle part côté français (Agora =
   FranceConnect, Make.org = identifié). C'est un vrai levier de participation
   pour les fonctionnaires, enseignants, soignants, salariés du privé qui ne
   s'expriment pas sur les réseaux sociaux par peur des représailles. C'est le
   pari gagnant de Pol.is.
2. **La contrainte de concrétude** est le vrai angle. Les plateformes
   existantes collectent des opinions ; très peu forcent la formulation
   *problème → proposition → bénéficiaire → arbitrage* (qui paie, qui perd
   quoi). Un format qui refuse les « il faut plus de justice » au profit de
   propositions évaluables serait une différence réelle — et précisément ce
   qu'un assistant parlementaire peut réutiliser dans un amendement.
3. **La boucle de retour mesurable** : afficher publiquement, par
   élu/région/thème : idées transmises, réponses reçues, suites données
   (question écrite, amendement, réponse ministérielle). Rendre visible le
   *taux de réponse* des élus crée une pression vertueuse et un contenu
   mesurable — c'est ce qui a manqué à tout le monde.

## 3. Conditions de survie

Résoudre le chicken-and-egg. Trois stratégies (non exclusives) :

- **Verticale** : un seul thème fort (logement, retraites, école, santé…)
  où le besoin d'input citoyen est criant, plutôt que « la politique » en
  général.
- **Locale** : un binôme avec quelques communes/départements volontaires,
  où l'accès aux élus est réel et le bouche-à-oreille efficace — c'est comme
  ça que Decidim a démarré (Barcelone).
- **Le canal des assistants parlementaires** : ce sont eux qui rédigent
  réellement. Leur donner un outil exploitable (idées triées, sourcées,
  formatées) est plus réaliste que de convertir 577 députés.

## 4. Points de vigilance dès le design (pas après)

- **Anonymat + intégrité** : empêcher qu'un acteur crée 500 comptes pour
  pousser une idée. Pistes : vérification « une personne une voix »
  décorrélée de l'identité (France Verif / compte citoyen), pondération
  statistique assumée et transparente, montrer des *clusters d'opinion*
  (mode Pol.is) plutôt que des comptes de votes absolus.
- **Neutralité** : structure (association ?), gouvernance et financement
  irréprochables, sinon la première accusation de biais politique tue la
  confiance — le talon d'Achille de Make.org.
- **Cadre légal** : voir 03-cadre-juridique.md. Ligne rouge diffamation /
  injure / incitation, particulièrement sensible vis-à-vis d'élus nommément
  désignés.

## 5. Verdict

Projet **pertinent mais à haut risque** : le besoin est réel, le créneau
exact (indépendant + anonyme + concret + boucle de retour) est libre, mais
90 % de la réussite se joue sur l'engagement des élus et la confiance,
10 % sur la plateforme elle-même.

Avant d'écrire le code :
1. valider la demande auprès de 20-30 citoyens et de 2-3 élus ou assistants
   parlementaires ;
2. partir sur une verticale ;
3. concevoir dès le départ le tableau public de suivi élus ↔ idées, qui est
   le différenciateur le plus défendable.
