// serveur/securite.ts — EMPREINTES, MOT DE PASSE ADMIN, JETONS, RYTHME.
//
//  · EMPREINTE : on ne stocke JAMAIS d'adresse IP en clair (charte de
//    minimisation, RGPD art. 9 — les opinions politiques sont sensibles).
//    Chaque visiteur n'est connu que comme sha256(ip + jour + sel), pour
//    doser le rythme — puis c'est oublié. Les avis sur une idée utilisent
//    sha256(sel + idée + ip) : stable, mais propre à chaque idée.
//  · MOT DE PASSE ADMIN : scrypt (node:crypto, zéro dépendance native —
//    argon2 demanderait un module compilé, scrypt est dans la boîte et
//    tient le coup contre une attaque hors ligne à ce niveau d'exposition).
//  · JETON ADMIN : HMAC-SHA256 signé par le secret, expiration portée par
//    le jeton lui-même ; cookie SameSite=Strict, HttpOnly.
//  · RYTHME : un compteur mémoire par clé, fenêtre glissante. Suffit pour
//    un processus unique derrière nginx (qui plafonne aussi, par adresse).

import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/** Échappe un texte pour l'insérer dans du HTML. La seule porte anti-XSS. */
export function echappe(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** L'empreinte d'une IP POUR UNE IDÉE, sans le jour : un avis par (idée,
 *  adresse), modifiable, et qui ne se renouvelle pas chaque matin (l'ancienne
 *  empreinte du jour laissait re-soutenir la même idée tous les jours).
 *  Le slug entre dans le hachage : la même adresse donne une empreinte
 *  différente sur chaque idée, on ne peut donc pas relier les avis d'une
 *  personne entre eux ni reconstituer ses opinions (RGPD art. 9). */
export function empreinteAvis(ip: string, sel: string, slug: string): string {
  return createHash('sha256').update(`avis|${sel}|${slug}|${ip}`).digest('hex').slice(0, 32);
}

/** L'empreinte du jour d'une IP : dose le rythme et trace un dépôt (LCEN)
 *  sans identité. */
export function empreinteIp(ip: string, sel: string, aujourdhui = new Date()): string {
  const jour = aujourdhui.toISOString().slice(0, 10);
  return createHash('sha256').update(`${jour}|${sel}|${ip}`).digest('hex').slice(0, 32);
}

/* ------------------------------------------------------------------ */
/* Mot de passe admin (scrypt)                                        */
/* ------------------------------------------------------------------ */

/** Produit l'empreinte à poser dans l'environnement (RP_EMPREINTE_MDP_ADMIN).
 * Format hex : sel$hash. Script outils/empreinte-mdp.mjs. */
export function empreinteMotDePasse(mdp: string): string {
  const sel = randomBytes(16);
  const hash = scryptSync(mdp, sel, 32);
  return `${sel.toString('hex')}$${hash.toString('hex')}`;
}

/** Vérifie un mot de passe contre sel$hash. Comparaison à temps constant. */
export function motDePasseValide(mdp: string, stocke: string): boolean {
  const parties = stocke.split('$');
  if (parties.length !== 2) return false;
  const sel = Buffer.from(parties[0]!, 'hex');
  const attendu = Buffer.from(parties[1]!, 'hex');
  if (sel.length === 0 || attendu.length === 0) return false;
  const calcule = scryptSync(mdp, sel, attendu.length);
  return calcule.length === attendu.length && timingSafeEqual(calcule, attendu);
}

/* ------------------------------------------------------------------ */
/* Jeton de session admin                                             */
/* ------------------------------------------------------------------ */

export const COOKIE_ADMIN = 'rp_admin';
const DUREE_ADMIN_MS = 6 * 3600 * 1000; // une session de modération : 6 h

/** Fabrique le jeton signé (exp.hmac), à poser dans le cookie. */
export function fabriqueJetonAdmin(sel: string, maintenant = Date.now()): string {
  const exp = maintenant + DUREE_ADMIN_MS;
  const corps = String(exp);
  const signature = createHmac('sha256', sel).update(`admin|${corps}`).digest('hex');
  return `${corps}.${signature}`;
}

/** Un jeton est-il valide et vivant ? */
export function jetonAdminValide(jeton: string | undefined, sel: string, maintenant = Date.now()): boolean {
  if (!jeton) return false;
  const [corps, signature] = jeton.split('.');
  if (!corps || !signature) return false;
  const attendu = createHmac('sha256', sel).update(`admin|${corps}`).digest('hex');
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(attendu, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const exp = Number(corps);
  return Number.isFinite(exp) && exp > maintenant;
}

/* ------------------------------------------------------------------ */
/* Cookies                                                            */
/* ------------------------------------------------------------------ */

export function lisCookies(enTete: string | undefined): Map<string, string> {
  const resultat = new Map<string, string>();
  if (!enTete) return resultat;
  for (const morceau of enTete.split(';')) {
    const egal = morceau.indexOf('=');
    if (egal === -1) continue;
    const cle = morceau.slice(0, egal).trim();
    try {
      const valeur = decodeURIComponent(morceau.slice(egal + 1).trim());
      if (cle) resultat.set(cle, valeur);
    } catch {
      // Un cookie malformé (% isolé…) ne doit pas transformer chaque
      // requête en 500 : on l'ignore, comme un cookie absent.
    }
  }
  return resultat;
}

export function cookieAdmin(jeton: string): string {
  return `${COOKIE_ADMIN}=${encodeURIComponent(jeton)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${DUREE_ADMIN_MS / 1000}`;
}

export function cookieAdminEfface(): string {
  return `${COOKIE_ADMIN}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

/* ------------------------------------------------------------------ */
/* Limiteur de rythme (fenêtre glissante, en mémoire)                 */
/* ------------------------------------------------------------------ */

export class Limiteur {
  private coups = new Map<string, number[]>();

  /** La clé peut-elle agir encore ? Enregistre l'essai si oui. */
  autorise(cle: string, max: number, fenetreMs: number, maintenant = Date.now()): boolean {
    const anciens = this.coups.get(cle) ?? [];
    const recents = anciens.filter((t) => maintenant - t < fenetreMs);
    if (recents.length >= max) {
      this.coups.set(cle, recents);
      return false;
    }
    recents.push(maintenant);
    this.coups.set(cle, recents);
    if (this.coups.size > 10_000) this.nettoie(maintenant, fenetreMs);
    return true;
  }

  private nettoie(maintenant: number, fenetreMs: number): void {
    for (const [cle, coups] of this.coups) {
      const recents = coups.filter((t) => maintenant - t < fenetreMs);
      if (recents.length === 0) this.coups.delete(cle);
      else this.coups.set(cle, recents);
    }
  }
}

/** L'adresse IP derrière nginx : X-Forwarded-For (premier terme) ou la
 * socket. nginx est configuré pour ÉCRASER l'en-tête (proxy_params_ratio.conf :
 * X-Forwarded-For $remote_addr) — sinon un client pourrait se forger une
 * empreinte et contourner tous les plafonds de rythme. */
export function ipDe(req: { headers: Record<string, string | string[] | undefined>; socket: { remoteAddress: string | null | undefined } }): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff !== '') {
    const premier = xff.split(',')[0]!.trim();
    if (premier !== '') return premier;
  }
  return req.socket.remoteAddress ?? 'inconnue';
}
