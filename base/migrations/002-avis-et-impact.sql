-- 002-avis-et-impact.sql — DES DONNÉES PLUS UTILES À LA DÉCISION.
--
-- Décision du 11/11/2026 (docs/decisions.md) :
--  · les soutiens deviennent des AVIS : d'accord / pas d'accord / sans avis,
--    plus un jugement séparé sur l'arbitrage (complet / partiel / incomplet).
--    Les soutiens existants deviennent des « d'accord ». Leur empreinte
--    était celle du jour : ces anciennes lignes ne seront pas reconnues par
--    la nouvelle empreinte par idée — un visiteur déjà venu pourra donc
--    compter une fois de plus, une seule fois. Accepté plutôt que de jeter
--    les soutiens réels ;
--  · l'impact chiffré optionnel d'une idée : effet, montant annuel, poste ;
--  · l'e-mail disparaît : jamais écrit par le code (toujours NULL), jamais
--    utilisé — minimisation.

ALTER TABLE soutiens RENAME TO avis;
ALTER TABLE avis
  ADD COLUMN position  TEXT CHECK (position IN ('pour', 'contre', 'sans-avis')),
  ADD COLUMN arbitrage TEXT CHECK (arbitrage IN ('complet', 'partiel', 'incomplet'));
UPDATE avis SET position = 'pour';
ALTER TABLE avis ADD CONSTRAINT avis_non_vide CHECK (position IS NOT NULL OR arbitrage IS NOT NULL);

ALTER TABLE idees
  ADD COLUMN effet         TEXT CHECK (effet IN ('cout', 'gain', 'neutre')),
  -- Euros par an, toujours positif : le sens est dans `effet`.
  ADD COLUMN montant_euros BIGINT CHECK (montant_euros > 0),
  -- Id d'un poste de serveur/reperes.ts (POSTES_CIBLES).
  ADD COLUMN poste         TEXT,
  DROP COLUMN email;
