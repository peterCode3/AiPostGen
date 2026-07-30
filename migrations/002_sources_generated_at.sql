-- src/lib/autoDentistFlow/articlesai.ts writes `generatedAt` on Source upserts.
-- Mongo accepted it silently because the collection was schemaless; MySQL would
-- reject it as an unknown column, so the field needs to exist explicitly.
--
-- Note the sibling write path (workers/scrape.ts) sets `fetchedAt` instead for
-- the same upsert — the two paths were already inconsistent under Mongo. Both
-- columns are kept rather than unifying them, so no existing data is reinterpreted.
ALTER TABLE sources
  ADD COLUMN generated_at DATETIME(3) NULL AFTER fetched_at;
