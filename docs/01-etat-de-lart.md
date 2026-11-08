# 01 — État de l'art : ce qui existe déjà

*Recherche menée le 08/11/2026.*

## 1. Plateformes officielles (étatiques)

| Plateforme | Ce qu'elle fait | Limite |
|---|---|---|
| **Agora** (agora.gouv.fr) | Plateforme officielle de participation de l'État, lancée 2023, relancée en juin 2026 : consultations, questions au gouvernement, suivi des résultats. Pilotée par la DITP. | Institutionnelle, pas d'anonymat, confiance des citoyens limitée. |
| **Pétitions de l'Assemblée nationale** (petitions.assemblee-nationale.fr) | ~1 700 pétitions, attribution aux 8 commissions permanentes, seuil de signatures pour examen. | Effet réel faible : une pétition aboutit rarement à un texte. |
| **Pétitions du Sénat** | Même principe, seuils différents. | Idem. |
| **CESE** | Pétitions, consultations en ligne, saisines participatives, « chambre des conventions citoyennes » depuis la réforme de 2020 (modèle Convention citoyenne pour le climat). | Poids consultatif, visibilité faible. |
| **consultations.gouv.fr** (historique) | Consultations publiques réglementaires ou ad hoc (ex. République numérique 2016). | Ponctuel, jamais devenu un lieu vivant. |

## 2. Civic tech privées françaises

### Make.org — le gros acteur
- Consultations massives à grande question, propositions ouvertes, votes, « consensus » classés par algorithme.
- Modèle : partenariats payants (Orange, France Travail, Cour des comptes, Dialogues Parisiens, France Bleu/France 3, « Grandes Causes » avec Fondation Engie…).
- **Critiques** :
  - flou sur le pouvoir réel donné aux citoyens (des « agendas citoyens » sans obligation de suivi décisionnel) ;
  - seuls 57 % des Français estiment que les consultations citoyennes ont un effet sur les décisions (Harris Interactive, mai 2023) ;
  - représentativité faible : profils spécifiques, non représentatifs (enquêtes universitaires 2023) — ex. la Cour des comptes n'a recueilli que ~9 000 inscriptions et 333 contributions à sa propre consultation ;
  - indépendance questionnée vis-à-vis des financeurs.

### Parlement & Citoyens — le précédent direct
- Créé janvier 2013 par le collectif Démocratie Ouverte (Cyril Lage). C'est **exactement l'idée de RatioPol** : les parlementaires soumettent des projets de loi à la contribution citoyenne (avis, votes, amendements, co-écriture), pétition législative à partir de 5 000 votes.
- Succès d'estime : consultation République numérique (Axelle Lemaire), citée par le Conseil constitutionnel comme exemple de transformation de l'écriture de la loi ; référencé par Nesta parmi les pionniers de la démocratie numérique.
- **Essoufflement net** : très actif 2013-2020, présence discrète depuis. Reprise partielle en 2019 par l'association Cap Collectif. Le site reste en ligne (API GraphQL active), consultations éparses (RIC, statut de l'élu, constitution). Aucun bilan public récent.

### Autres
- **Pol** (pol-app.fr) : app d'information sur les textes de l'Assemblée, vise le lien jeunes/élus. Informer, pas co-produire.
- **Open Source Politics / Cap Collectivités (Demos)** : éditeurs de plateformes de consultation pour collectivités (logiciel Consul forké).
- **ConsultVox, Voxe.org** : information/engagement, pas de co-production.
- **Pétitionnaires généralistes** : Change.org, Mes Opinions, Avaaz — pétitions sans canal institutionnel.

## 3. Références internationales

### vTaiwan / Pol.is — le précédent « anonymat »
- Pol.is : conversations à grande échelle où les participants sont **anonymes** et ne peuvent **pas se répondre directement** (anti-polémique par construction). Chacun soumet des courtes propositions, les autres votent pour/contre/neutre ; un clustering statistique fait émerger les groupes d'opinion et les points de consensus inter-groupes.
- vTaiwan a utilisé ça pour réguler Uber, les coliques financières, etc.
- **Bilan contrasté** : célébré (audrey tang, g0v), puis qualifié de « huge flop » (Daily Beast) — l'outil marchait, mais l'administration a cessé de donner suite aux conclusions ; contre-analyses plus nuancées (Reboot Democracy).

### Decidim (Barcelone) / Consul (Decide Madrid)
- Logiciels libres de participation : assemblées, propositions, budgets participatifs.
- Utilisés surtout par des collectivités ; Madrid a connu une crise de manipulation (bots sur propositions citoyennes en 2016) ; participation réelle souvent modeste.

### Modèle britannique des e-pétitions (à distinguer, très instructif)
- pétition.parliament.uk : 10 000 signatures → réponse officielle du gouvernement ; 100 000 → débat au Parlement. **C'est la boucle de retour obligatoire la plus structurée au monde** — voir 04-pistes-produit.

### Conférence sur l'avenir de l'Europe (2021-2022)
- Plateforme multilingue UE de partage d'idées. Bilan : millions de contributions, requalification finale contestée, effet réel débattu.

## 4. Le lieu réel du débat : les réseaux sociaux

X, Facebook, TikTok sont *de facto* l'endroit où les Français partagent leurs
idées politiques, anonymement ou non, et où les élus sont présents. Le vrai
concurrent de RatioPol n'est pas Make.org : c'est X — avec ses défauts
(polarisation, invisibilité des bonnes idées, absence de structuration,
modération opaque).

## Sources principales

- https://www.agora.gouv.fr
- https://www.modernisation.gouv.fr/associer-les-citoyens/application-agora
- https://about.make.org/fr/about-us
- https://theconversation.com/les-consultations-citoyennes-peuvent-elles-redefinir-la-legitimite-politique-176593
- https://www.nesta.org.uk/feature/six-pioneers-digital-democracy/parlement-et-citoyens
- https://sciencespo.hal.science/hal-02290563v2/document
- https://fr.wikipedia.org/wiki/Pol.is
- https://www.thedailybeast.com/taiwan-tried-to-digitize-democracy-with-vtaiwan-it-was-a-huge-flop
- https://rebootdemocracy.ai/blog/was-vtaiwan-such-a-big-flop-after-all
- https://www.novethic.fr/actualite/social/droits-humains/isr-rse/reforme-du-cese-la-troisieme-assemblee-va-devenir-la-chambre-des-conventions-citoyennes-148922.html
- https://www.vie-publique.fr/eclairage/285115-dsa-le-reglement-sur-les-services-numeriques-ou-digital-services-act
- https://www.strategie-plan.gouv.fr/le-numerique-transforme-t-il-la-participation-citoyenne
- https://www.cnil.fr/sites/default/files/atoms/files/cnil_cahier_ip7-web.pdf
- https://www.pol-app.fr
