# CLAUDE.md — RatioPol

Plateforme citoyenne gratuite de dépôt et lecture d'idées politiques
**concrètes** (problème → proposition → bénéficiaires → arbitrage →
indicateur). France entière, tous thèmes. Stratégie « l'outil d'abord » :
aucun démarchage, un très bon outil gratuit — cf. `docs/decisions.md`.

## Ce qui ne se négocie pas

- **Le gabarit est le produit.** `serveur/gabarit.ts` encode le refus des
  opinions non actionnables. Toute évolution de ses bornes se discute avec
  Paul et se note dans `docs/decisions.md`.
- **Zéro ressource externe** : pas de police, de CDN, de tracker, d'API
  tierce. CSP `default-src 'self'`. La pile de polices est système.
- **On critique des actes et des idées, jamais des personnes** — la règle de
  modération est publique (`/moderation`), le filtre anti-attaque est dans le
  gabarit et la modération a posteriori.
- **Minimisation RGPD art. 9** : les opinions politiques sont des données
  sensibles. Pas d'IP en clair (empreinte hachée du jour), pas de profilage,
  consentement explicite au dépôt, suppression sur demande.
- **Les tests verts précèdent tout déploiement** — le déployeur refuse sinon.

## Commandes

```sh
npm run build     # esbuild : front + serveur → dist/
npm test          # build + node --test (18 tests, ~1 s)
npm run migrer    # pose base/migrations/ (RP_PG_URL requis)
node deploiement/deployer.mjs          # déploie (git propre + poussé requis)
node deploiement/deployer.mjs --retour # retour arrière
lourd node outils/capture.mjs          # captures d'écran (navigateur sans tête)
node outils/empreinte-mdp.mjs 'mdp'    # empreinte admin pour /etc/ratiopol.env
```

## Architecture en une page

Voir `ARCHITECTURE.md`. L'essentiel :

- **Rendu côté serveur** (`serveur/rendu.ts`, fonctions retournant du HTML) :
  chaque idée a une URL propre, indexable, lisible sans JavaScript.
- **Serveur HTTP maison sans framework** (`serveur/serveur.ts`) : plomberie
  mince, aucune règle métier dedans.
- **Interface `Depot`** (`serveur/depot.ts`) : `DepotMemoire` (tests),
  `DepotPg` (production, PostgreSQL, base `ratiopol_database`).
- **JS navigateur minimal** (`web/main.ts`) : compteurs de caractères et
  soutien sans rechargement. Le site marche sans lui.
- Les **tests importent `dist/serveur.mjs`** : on teste le binaire déployé.

## Environnement (production : `/etc/ratiopol.env` sur le VPS)

| Variable | Rôle |
|---|---|
| `RP_PORT` | port local (8090 par défaut) |
| `RP_SEL` | secret long : empreintes IP, jetons admin |
| `RP_PG_URL` | `postgres://debian@localhost/ratiopol_database?host=/var/run/postgresql` (socket, peer auth) |
| `RP_ORIGINE` | `https://ratiopol.fr` (sitemap, canoniques) |
| `RP_EMPREINTE_MDP_ADMIN` | sel$hash scrypt — absent ⇒ `/admin` fermé (503) |

## Conventions

- Tout code, commit et commentaire **en français**, à la manière des dépôts
  voisins (Miliad, MateMaterial, VpsBoard) : fichiers courts, en-tête qui
  explique le POURQUOI, pas le comment.
- Aucune valeur littérale dans `web/page.css` : les jetons (`--r-*`) se
  demandent dans `web/jetons.css`.
- Noms de fichiers statiques empreintés SHA-256 par `build.mjs` (cache
  immuable) ; le manifeste `dist/manifeste.json` fait le lien côté serveur.
- Ne jamais toucher `/var/www` ni `/opt/ratiopol` à la main : tout passe par
  `deploiement/deployer.mjs` (bascule atomique, retour une commande).
