-- Fixes two real data-migration failures found importing the live DocumentDB
-- dump (234 articles / 39 sources / 75 keywords).
--
-- 1) COLLATION CHANGED UNIQUENESS SEMANTICS.
--    Mongo's `unique: true` index is case-SENSITIVE. MySQL's utf8mb4_unicode_ci
--    is case- and accent-INSENSITIVE, so it collapsed 5 keyword pairs that
--    differ only in capitalisation, e.g.
--        "Dental diagnostic imaging software using AI"
--        "dental diagnostic imaging software using AI"
--    Those inserts failed with Duplicate entry. Verified there are ZERO true
--    duplicate terms in the source data — the conflict was created by the
--    schema, not present in the data.
--
--    This matters because 52 articles reference the 5 rejected keyword ids via
--    articles.keyword_id, so discarding them would leave dangling references.
--
--    Fix: collate the unique-indexed text as utf8mb4_bin (byte-exact), which
--    reproduces Mongo's case-sensitive behaviour.
--
-- 2) TERM LENGTH OVERFLOW.
--    Two keyword terms are 1497 and 1938 characters — almost certainly
--    malformed extractions (the kind `parseKeywords()` exists to defend
--    against). VARCHAR(512) rejected them outright. Widened to TEXT so no
--    source row is silently lost; the unique index stays on a 255-char prefix
--    (verified: zero terms collide on their first 255 characters).
--
-- `sources.url` gets the same binary collation. No URL collisions occur at the
-- current 39 rows, but URL paths are case-sensitive by spec and this prevents
-- the identical bug appearing later with more data.

SET NAMES utf8mb4;

ALTER TABLE keywords
  DROP INDEX uq_keywords_term,
  MODIFY COLUMN term TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  ADD UNIQUE KEY uq_keywords_term (term(255));

ALTER TABLE sources
  DROP INDEX uq_sources_url,
  MODIFY COLUMN url VARCHAR(2048) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  ADD UNIQUE KEY uq_sources_url (url(500));
