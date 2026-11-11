# RatioPol

Site web permettant de partager des idées politiques de façon anonyme ou non,
dans le but d'apporter des pistes de réflexion concrètes et d'interagir avec
les politiques en poste, de façon à orienter la politique publique.

**Périmètre initial : la France.**

## État du projet

Novembre 2026 : phase d'exploration terminée (état de l'art, cadre juridique,
pistes produit). **Décision du 08/11** ([decisions.md](docs/decisions.md)) :
stratégie « l'outil d'abord » — pas de démarchage, on construit un superbe
outil gratuit et utile en autarcie ; développement sur mesure, léger, sur le
VPS existant.

**La v1 est construite** (08/11 au soir) : serveur Node sans framework, rendu
HTML côté serveur, PostgreSQL, gabarit d’idée à cinq champs + impact chiffré optionnel, avis
dédupliqués par idée, signalements, modération admin, 24 tests verts. Voir
`ARCHITECTURE.md` et `CLAUDE.md`.

## Commandes

```sh
npm run build                          # esbuild → dist/
npm test                               # build + tests
node deploiement/deployer.mjs          # mise en ligne (VPS)
node deploiement/deployer.mjs --retour # retour arrière
lourd node outils/capture.mjs          # captures d'écran
```

## Ce qui reste à faire (Paul)

- réserver **ratiopol.fr** et pointer le DNS vers le VPS ;
- première pose : `ssh vps-projets`, puis `deploiement/installer-vps.sh` ;
- générer le mot de passe admin (`outils/empreinte-mdp.mjs`) et le poser
  dans `/etc/ratiopol.env` ;
- compléter l'adresse de contact de la page `/mentions`.

## Documentation

| Document | Contenu |
|---|---|
| [docs/01-etat-de-lart.md](docs/01-etat-de-lart.md) | Ce qui existe déjà : plateformes officielles, civic tech françaises, références internationales |
| [docs/02-enseignements-et-pertinence.md](docs/02-enseignements-et-pertinence.md) | Pourquoi les autres ont échoué ou plafonné ; évaluation honnête du projet ; conditions de survie |
| [docs/03-cadre-juridique.md](docs/03-cadre-juridique.md) | Anonymat en ligne (LCEN), DSA, RGPD (données politiques = sensibles), diffamation/injure envers élus |
| [docs/04-pistes-produit.md](docs/04-pistes-produit.md) | Format « idée structurée », boucle de retour mesurable, anti-manipulation, gouvernance, MVP |
| [docs/05-choix-plateforme.md](docs/05-choix-plateforme.md) | Choix technique : MediaWiki écarté ; Decidim vs développement sur mesure ; recommandation |
| [docs/decisions.md](docs/decisions.md) | Journal des décisions (2026-11-08 : stratégie « l'outil d'abord », développement sur mesure) |
