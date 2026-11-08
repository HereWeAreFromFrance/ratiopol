# 03 — Cadre juridique (France, nov. 2026)

*Recherche documentaire, ne remplace pas un avis d'avocat.*

## 1. L'anonymat en ligne : légal, mais nuancé

- L'anonymat/pseudonymat des **contributeurs** est légal en France sur internet.
- MAIS le modèle français éprouvé est celui du **pseudonymat**, pas de l'anonymat
  absolu : la plateforme conserve les données d'identification des auteurs
  (LCEN art. 6-II) et les communique à la justice sur réquisition. C'est le
  modèle des commentaires de presse (Le Monde, etc.).
- **Conséquence design** : promettre « l'anonymat » publiquement (pseudos,
  jamais de nom affiché) tout en étant transparent sur le fait que l'identité
  réelle est connue de la plateforme et transmissible sur réquisition. Une
  fausse promesse d'anonymat total serait un mensonge dangereux
  (confiance + RGPD).

## 2. Statut de la plateforme : hébergeur (LCEN art. 6-I-2)

- Régime de responsabilité atténuée : pas responsable des contenus utilisateurs
  tant qu'ignorance du caractère manifestement illicite.
- **Pas d'obligation générale de surveillance** (art. 6-I-7).
- **Obligation de prompt retrait** dès notification régulière d'un contenu
  manifestement illicite. Un dispositif de signalement visible et traité vite
  est donc une obligation pratique, pas une option.
- Risque de basculer du statut d'hébergeur à celui d'**éditeur** si la
  plateforme sélectionne/édite/promeut des contenus (curation, mise en avant)
  — à cadrer soigneusement : la curation (tri des idées, mises en avant)
  devra être transparente et algorithmique plutôt qu'éditoriale, ou assumée
  avec la responsabilité qui va avec.

## 3. DSA (règlement UE services numériques)

- S'applique dès qu'on héberge du contenu utilisateur, y aux petites
  plateformes (les obligations lourdes — audits, évaluation de risques — ne
  visent que les grandes plateformes > 45 M utilisateurs, mais les bases
  s'appliquent à tous).
- Bases pour tous : point de contact, **procédure de signalement interne
  (notice & action)**, transparence des modérations, recours interne contre
  les décisions de modération. Coordinateur en France : **Arcom**.
- Contenus terroristes / pédocriminels : retrait dans l'heure après
  notification. Peu probable au lancement mais la mécanique doit exister.
- La transparence exigée (raisons des retraits, recours) rejoint la
  gouvernance « à son compte » du projet (doc 04).

## 4. RGPD : les opinions politiques sont des données sensibles (art. 9)

**C'est la contrainte centrale du projet** : la loi interdit par principe le
traitement des données révélant les **opinions politiques** (art. 9 §1).
Exceptions pertinentes :

- **consentement explicite** (art. 9 §2 a) : la voie praticable — chaque
  utilisateur consent explicitement au traitement de ses contributions
  politiques ; le retrait du consentement doit être effectif (suppression
  des contributions ou anonymisation irréversible — à décider) ;
- la publication par la personne elle-même de ses opinions (art. 9 §2 e)
  — couvre le cas nominal, pas le cas anonyme.

Conséquences concrètes :
- minimisation drastique : ne pas stocker ce qu'on n'affiche pas ;
- pas de profilage politique des utilisateurs (jamais de « vos idées
  recommandées » basées sur l'opinion) ;
- sécurité renforcée : une fuite de la base serait une fuite de données
  sensibles (sanctions majorées) ;
- la CNIL a un cahier dédié « Civic tech, données et Demos » (IP n°7, 2019) —
  à lire en détail avant l'écriture du code, et une demande d'accompagnement
  CNIL est possible gratuitement.

## 5. Loi du 29 juillet 1881 : diffamation et injure, le risque n° 1

- Art. 31 : diffamation/injure envers les **élus et détenteurs de l'autorité
  publique** — régime **aggravé** (jusqu'à 45 000 €, 1 an
  d'emprisonnement pour l'injure) contre 12 000 € pour les particuliers
  (art. 32).
- Prescription de **3 mois** à compter de la mise en ligne — la plateforme
  sera notifiée vite ou jamais.
- Un espace où des citoyens critiquent des élus **nommément** génèrera des
  plaintes ; il faut dès le design :
  - un filtre anti-attaque personnelle (règle : critiquer des actes et des
    idées, jamais des personnes — la critique d'actes avec faits précis et
    vérifiables n'est pas diffamatoire ; l'imputation sans preuve l'est) ;
  - la conservation des éléments d'identification (LCEN art. 6-II) pour
    répondre aux réquisitions ;
  - une procédure de retrait/notification rapide (conjointe au point 2).
- L'anonymat ne protège pas l'auteur (réquisition → plateforme) ni la
  plateforme si elle reste passive après notification.

## 6. Autres points à instruire plus tard

- Statut juridique de l'opérateur : association loi 1901 (cohérent avec la
  neutralité revendiquée) vs société ; financement (dons, subventions,
  partenariats — attention à l'indépendance).
- Hébergement et Référentiel général (StateCloud / SecNumCloud si un jour des
  données à caractère sensible sont qualifiées d'intérêt général).
- Données des mineurs (l'âge minimum sera posé, aucune donnée sensible de
  mineurs sans précautions renforcées).
- Accessibilité (obligation RGAA si service de communication au public en
  ligne — à vérifier selon le statut).

## Sources

- LCEN / hébergeurs : https://www.conseil-constitutionnel.fr/nouveaux-cahiers-du-conseil-constitutionnel/contenus-illicites-sur-internet-et-hebergeurs , https://www.service-public.gouv.fr/particuliers/vosdroits/F32075
- DSA : https://www.vie-publique.fr/eclairage/285115-dsa-le-reglement-sur-les-services-numeriques-ou-digital-services-act
- RGPD art. 9 : https://www.privacy-regulation.eu/fr/9.htm ; CNIL consentement : https://www.cnil.fr/fr/les-bases-legales/consentement ; CNIL civic tech : https://www.cnil.fr/sites/default/files/atoms/files/cnil_cahier_ip7-web.pdf
- Loi 1881 : https://www.legifrance.gouv.fr/loda/id/LEGITEXT000006070722 ; art. 32 : https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000038313312 ; élus/réseaux sociaux : https://www.mairesdefrance.com/diffamation-injures-sur-les-reseaux-sociaux-comment-agir-article-300-0 , https://riant-avocat.fr/diffamation-elu-maire-reseaux-sociaux-porter-plainte
