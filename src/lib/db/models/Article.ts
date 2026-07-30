import { createModel } from '../model';

/**
 * Articles. Nested sub-documents (sourceRefs, outline, content, seo, review,
 * cost) are stored as native MySQL JSON — see migrations/001_mongo_to_mysql.sql.
 * (slug, language) is unique: EN and AR translations share one slug.
 */
export default createModel({
  table: 'articles',
  json: ['keywords', 'sourceRefs', 'outline', 'content', 'seo', 'review', 'cost'],
  dates: ['scheduledAt', 'publishedAt', 'createdAt', 'updatedAt'],
});
