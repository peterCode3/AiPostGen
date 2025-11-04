import { Schema, model, models } from 'mongoose';

const SourceSchema = new Schema({
  url: { type: String, unique: true },
  domain: String,
  robotsAllowed: Boolean,
  rawHtml: String,
  text: String,
  language: String,
  metadata: { title: String, author: String, published: Date },
  hash: { type: String, index: true },
  used: { type: Boolean, default: false },         
  usedAt: { type: Date },                          
  fetchedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default models.Source || model('Source', SourceSchema);
