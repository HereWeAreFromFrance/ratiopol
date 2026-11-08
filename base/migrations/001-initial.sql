-- 001-initial.sql — LE SCHÈME DE DÉPART.
--
-- Trois tables, rien de plus. Tout ce qui est texte vient des visiteurs :
-- aucun INDEX FULLTEXT prématuré (la recherche LIKE de la v1 s'en passe, le
-- tsvector se demandera le jour où ça pèse).

CREATE TABLE idees (
  id            BIGSERIAL PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  titre         TEXT NOT NULL,
  probleme      TEXT NOT NULL,
  proposition   TEXT NOT NULL,
  beneficiaires TEXT NOT NULL,
  arbitrage     TEXT NOT NULL,
  indicateur    TEXT NOT NULL,
  theme         TEXT NOT NULL,
  niveau        TEXT NOT NULL,
  pseudo        TEXT NOT NULL,
  -- E-mail optionnel de contact, jamais affiché.
  email         TEXT,
  -- Empreinte sha256(ip+jour+sel) : déduplication sans identité (LCEN/RGPD).
  empreinte     TEXT NOT NULL,
  statut        TEXT NOT NULL DEFAULT 'publiee' CHECK (statut IN ('publiee', 'masquee')),
  creee_le      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idees_statut_creee_le_idx ON idees (statut, creee_le DESC);
CREATE INDEX idees_theme_idx ON idees (theme);

CREATE TABLE soutiens (
  idee_id    BIGINT NOT NULL REFERENCES idees(id) ON DELETE CASCADE,
  empreinte  TEXT NOT NULL,
  le         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (idee_id, empreinte)
);

CREATE TABLE signalements (
  id       BIGSERIAL PRIMARY KEY,
  idee_id  BIGINT NOT NULL REFERENCES idees(id) ON DELETE CASCADE,
  motif    TEXT NOT NULL,
  message  TEXT NOT NULL DEFAULT '',
  le       TIMESTAMPTZ NOT NULL DEFAULT now()
);
