-- AiPostGen: DocumentDB/MongoDB -> Cloud SQL MySQL 8
--
-- Design notes:
--  * Ids are CHAR(24) holding the original Mongo ObjectId hex. This keeps
--    cross-document references valid after a straight data copy and keeps
--    existing admin URLs (/api/articles/draft/<id>) working unchanged.
--  * Deeply nested sub-documents (sourceRefs, outline, content, seo, review,
--    cost, serp, metadata, payload) stay as native JSON. Only fields that are
--    actually filtered or sorted on get real columns + indexes.
--  * utf8mb4 throughout — articles are bilingual (en + ar).

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id          CHAR(24)     NOT NULL,
  email       VARCHAR(320) NOT NULL,
  name        VARCHAR(255) NULL,
  role        ENUM('admin','editor','contributor','viewer') NOT NULL DEFAULT 'viewer',
  provider    VARCHAR(64)  NOT NULL DEFAULT 'credentials',
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS keywords (
  id          CHAR(24)     NOT NULL,
  term        VARCHAR(512) NOT NULL,
  locale      VARCHAR(16)  NOT NULL DEFAULT 'en',
  intent      ENUM('informational','commercial','transactional') NOT NULL DEFAULT 'informational',
  serp        JSON         NULL,
  used        TINYINT(1)   NOT NULL DEFAULT 0,
  used_at     DATETIME(3)  NULL,
  fetched_at  DATETIME(3)  NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  -- term was `unique: true` in Mongoose. VARCHAR(512) utf8mb4 exceeds the 3072-byte
  -- index limit, so the unique key is on a 255-char prefix.
  UNIQUE KEY uq_keywords_term (term(255)),
  KEY idx_keywords_used (used),
  KEY idx_keywords_locale (locale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sources (
  id              CHAR(24)     NOT NULL,
  url             VARCHAR(2048) NOT NULL,
  domain          VARCHAR(255) NULL,
  robots_allowed  TINYINT(1)   NULL,
  raw_html        LONGTEXT     NULL,
  text            LONGTEXT     NULL,
  language        VARCHAR(16)  NULL,
  metadata        JSON         NULL,
  hash            VARCHAR(128) NULL,
  used            TINYINT(1)   NOT NULL DEFAULT 0,
  used_at         DATETIME(3)  NULL,
  fetched_at      DATETIME(3)  NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  -- url was `unique: true`; prefix index for the same byte-limit reason.
  UNIQUE KEY uq_sources_url (url(500)),
  KEY idx_sources_hash (hash),
  KEY idx_sources_used (used)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS articles (
  id                CHAR(24)     NOT NULL,
  slug              VARCHAR(512) NULL,
  title             TEXT         NULL,
  meta_title        TEXT         NULL,
  meta_description  TEXT         NULL,
  keywords          JSON         NULL,
  keyword_id        CHAR(24)     NULL,
  prompt            LONGTEXT     NULL,
  status            ENUM('draft','review','scheduled','published','rejected') NOT NULL DEFAULT 'draft',
  language          VARCHAR(16)  NOT NULL DEFAULT 'en',
  canonical_url     VARCHAR(2048) NULL,
  featured_image    VARCHAR(2048) NULL,
  source_refs       JSON         NULL,
  outline           JSON         NULL,
  content           JSON         NULL,
  seo               JSON         NULL,
  review            JSON         NULL,
  cost              JSON         NULL,
  scheduled_at      DATETIME(3)  NULL,
  published_at      DATETIME(3)  NULL,
  created_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  -- Mongo had a compound (slug, language) index: EN and AR share one slug.
  UNIQUE KEY uq_articles_slug_lang (slug(191), language),
  KEY idx_articles_status (status),
  KEY idx_articles_language (language),
  KEY idx_articles_published_at (published_at),
  KEY idx_articles_keyword_id (keyword_id),
  -- Drives the public list query: published articles by locale, newest first.
  KEY idx_articles_status_lang_published (status, language, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jobs (
  id          CHAR(24)    NOT NULL,
  type        VARCHAR(64) NULL,
  payload     JSON        NULL,
  status      ENUM('pending','active','succeeded','failed') NOT NULL DEFAULT 'pending',
  attempts    INT         NULL DEFAULT 0,
  error       TEXT        NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_jobs_status (status),
  KEY idx_jobs_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
