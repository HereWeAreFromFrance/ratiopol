// outils/empreinte-mdp.mjs — l'empreinte scrypt du mot de passe admin.
//
// Usage : node outils/empreinte-mdp.mjs 'votre mot de passe'
// Le résultat (sel$hash) se pose dans /etc/ratiopol.env :
//   RP_EMPREINTE_MDP_ADMIN=<resultat>
// puis : ssh vps-projets 'sudo systemctl restart ratiopol'
// Le mot de passe lui-même ne s'écrit NULLE PART.

import { empreinteMotDePasse } from '../dist/serveur.mjs';

const mdp = process.argv[2];
if (!mdp || mdp.length < 8) {
  console.error('Donnez un mot de passe d’au moins 8 caractères : node outils/empreinte-mdp.mjs "votre mot de passe"');
  process.exit(1);
}
console.log(empreinteMotDePasse(mdp));
