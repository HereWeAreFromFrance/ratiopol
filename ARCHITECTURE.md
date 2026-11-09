# RatioPol — Architecture

*Site et serveur d'une plateforme d'idées politiques concrètes. V1 posée le
08/11/2026. La réflexion produit vit dans `docs/` ; ici, la mécanique.*

## Vue d'ensemble

```
navigateur ──HTML rendu serveur──┐
   │  (JS mininal : compteurs,   │
   │   soutien async, secours     ▼
   │   natif si JS échoue)   nginx (vhost, TLS, limit_req, /_vu)
   │                              │ 127.0.0.1:8090
   │                              ▼
   │                     dist/serveur.mjs  (Node, zéro framework)
   │                        ├─ serveur.ts    boucle HTTP, mince
   │                        ├─ gabarit.ts    LA RÈGLE (validation, pur)
   │                        ├─ rendu.ts      pages HTML (échappées)
   │                        └─ Depot ──┬── DepotMemoire (tests)
   └── /statique/*  (empreintés ──────┴── DepotPg ── PostgreSQL 18
       SHA-256, cache 1 an)                          base ratiopol_database
```

## Les morceaux

### `serveur/gabarit.ts` — la règle du projet, en pur
Valide (et refuse) chaque idée : bornes de longueur par champ, thème/niveau
dans les listes, pseudonyme sans caractères de code, consentement RGPD
exigé. Zéro I/O : les tests le jugent sans serveur (`test/gabarit.test.mjs`)
et le même module autorise côté client l'aide à la saisie (les compteurs
affichent les mêmes bornes).

### `serveur/serveur.ts` — plomberie mince
Boucle HTTP maison : routes GET (pages, statiques, sitemap, robots, /_vu,
/sante) et POST (dépôt, soutien, signalement, admin). Les garde-fous :
corps plafonné à 64 Kio, limiteur de rythme par empreinte (dépôts 5/10 min,
soutiens 20/min, signalements 10/h, connexions admin 10/h), champ-piège
anti-robots, en-têtes de sécurité sur toute réponse. Le client peut demander
du JSON (`Accept: application/json`) — sinon formulaires natifs et
redirections 303 : le site marche sans JavaScript.

### `serveur/rendu.ts` — les pages
Fonctions retournant du HTML servies telles quelles. Tout contenu de
visiteur passe par `echappe()` — anti-XSS par construction, vérifié par test.
Design éditorial : pile de polices système, une couleur d'accent, colonne de
68ch, thème sombre par `prefers-color-scheme`. Les chiffres de la page
Repères vivent dans `reperes.ts` — sources officielles nommées, mis à jour à
la main à chaque loi de finances (règles dans `docs/decisions.md`).

### `serveur/depot.ts` + `depot-memoire.ts` + `postgres.ts`
Le serveur ne connaît que l'interface `Depot`. `DepotMemoire` pour les tests
(règles métier identiques : un soutien par empreinte, tri, statut),
`DepPg` pour la production — requêtes toutes paramétrées. Le schéma vit
dans `base/migrations/` (pose par `npm run migrer`, idempotent).

### `web/` — le peu de navigateur
`jetons.css` (design system `--r-*`), `page.css` (composants),
`main.ts` (compteurs de caractères, soutien sans rechargement — avec
secours : si le fetch échoue, le formulaire natif reprend la main).

### `build.mjs` — deux bundles, un manifeste
esbuild : `web/main.ts` + `web/page.css` (l'`@import` de jetons.css y est
inliné) vers `dist/statique/` sous noms empreintés SHA-256 (cache immuable) ;
`serveur/serveur.ts` vers `dist/serveur.mjs` (packages externes). Le
manifeste `dist/manifeste.json` dit au serveur quels noms servir.

### Modération (`/admin`)
Session par cookie signé HMAC (SameSite=Strict, 6 h), mot de passe vérifié
contre une empreinte scrypt posée dans `/etc/ratiopol.env`
(`outils/empreinte-mdp.mjs`). Actions : masquer, republier, supprimer ;
les signalements s'affichent en tête. Sans empreinte configurée, `/admin`
répond 503 : la modération est fermée, pas ouverte à tous.

## Sécurité & conformité — décisions et où elles vivent

| Sujet | Décision | Code |
|---|---|---|
| XSS | échappement systématique, testé | `rendu.ts` + `test/http.test.mjs` |
| Injection SQL | requêtes 100 % paramétrées (postgres.js) | `postgres.ts` |
| CSP | `default-src 'self'; form-action 'self'` partout | `serveur.ts` |
| RGPD art. 9 | consentement explicite au dépôt ; aucune IP en clar | `gabarit.ts`, `securite.ts` |
| LCEN 6-II | empreinte conservée à la création (traçabilité) | `postgres.ts` |
| DSA bases | signalement sur chaque idée, journal de modération | routes `/idee/*/signalement` |
| Anti-automates | honeypot + double limiteur (nginx + serveur) | `serveur.ts`, `ratiopol.nginx.conf` |

## Hors périmètre v1 (voulu, pas manquant)

Comptes persistants, vérification FranceConnect/jeton décorrélé, clusters
d'opinion façon Pol.is, tableau public de suivi élus ↔ idées, tsvector,
API publique, i18n. Le raisonnement est dans `docs/04-pistes-produit.md` —
chaque extension devra d'abord y inscrire sa décision.

## Déploiement

`deploiement/deployer.mjs` : tests verts → git propre et poussé → envoi
sous `.nouveau` → migrations → bascule atomique (`actuel` ↔ `.precedent`) →
contrôle HTTP → retour arrière automatique sinon. Première pose :
`deploiement/installer-vps.sh` (base PG, `/etc/ratiopol.env`, systemd,
nginx). Le DNS de ratiopol.fr reste à faire pointer par Paul.
