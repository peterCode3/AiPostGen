import { Schema, model, models, Types } from 'mongoose';

const SourceRefSchema = new Schema({
  sourceId: { type: Schema.Types.ObjectId, ref: 'Source' },
  url: String,
  title: String,
  passages: [String],
});

const ArticleSchema = new Schema({
  slug: { type: String, unique: true, index: true },
  title: String,
  metaTitle: String,
  metaDescription: String,
  keywords: [String],
  keywordId: { type: Schema.Types.ObjectId, ref: 'Keyword' },
  prompt: { type: String },
  status: {
    type: String,
    enum: ['draft', 'review', 'scheduled', 'published', 'rejected'],
    default: 'draft',
    index: true,
  },
  language: { type: String, default: 'en' },
  canonicalUrl: String,
  sourceRefs: [SourceRefSchema],
  outline: [{ h: String, bullets: [String] }],
  content: { html: String, markdown: String },
  seo: {
    schemaOrgJson: Schema.Types.Mixed,
    internalLinks: [{ href: String, anchor: String }],
    images: [{ url: String, alt: String, caption: String }],
    og: { title: String, description: String, image: String },
  },
  review: {
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    changes: [
      {
        at: Date,
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        diff: Schema.Types.Mixed,
      },
    ],
  },
  cost: { totalUSD: Number, tokensIn: Number, tokensOut: Number, provider: String },
  scheduledAt: Date,
  publishedAt: Date,
}, { timestamps: true });


export type ArticleDoc = typeof ArticleSchema extends infer T ? any : any;
export default models.Article || model('Article', ArticleSchema);
