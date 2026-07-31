-- Repoint article cover images away from AWS S3.
--
-- All 234 published articles carried an absolute URL to a PUBLIC S3 object:
--   https://aipostgen-assets-eu.s3.eu-central-1.amazonaws.com/covers/<file>
-- Those objects were copied to gs://<bucket>/covers/<file>, but that bucket is
-- private, so the storage URL cannot be used directly. They are now served by
-- the app itself through /api/media/covers/<file>, which streams from GCS with
-- the service account and sets immutable cache headers.
--
-- Absolute, not relative: these rows are also read by edentist.ai through the
-- backend blog proxy, where a relative path would resolve against the wrong host.
--
-- Reversible: the S3 URL is recoverable by swapping the prefix back, and the
-- rollback statement at the bottom does exactly that.

UPDATE articles
SET featured_image = CONCAT(
      'https://blog.edentist.ai/api/media/covers/',
      SUBSTRING_INDEX(featured_image, '/covers/', -1)
    )
WHERE featured_image LIKE '%amazonaws.com/covers/%';

-- Verification (expect s3_covers = 0, proxied = 234):
--   SELECT SUM(featured_image LIKE '%amazonaws%')                AS s3_covers,
--          SUM(featured_image LIKE '%/api/media/covers/%')       AS proxied
--   FROM articles;

-- Rollback:
--   UPDATE articles
--   SET featured_image = CONCAT(
--         'https://aipostgen-assets-eu.s3.eu-central-1.amazonaws.com/covers/',
--         SUBSTRING_INDEX(featured_image, '/api/media/covers/', -1))
--   WHERE featured_image LIKE '%/api/media/covers/%';
