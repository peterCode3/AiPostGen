import { Schema, model, models } from 'mongoose';

const KeywordSchema = new Schema({
  term: { type: String, unique: true, index: true },
  locale: { type: String, default: 'en' },
  intent: { 
    type: String, 
    enum: ['informational', 'commercial', 'transactional'], 
    default: 'informational' 
  },
  serp: { 
    topUrls: [String], 
    volume: Number, 
    difficulty: Number 
  },
  used: { type: Boolean, default: false },         
  usedAt: { type: Date },                          
  fetchedAt: { type: Date, default: Date.now },    
}, { timestamps: true });

export default models.Keyword || model('Keyword', KeywordSchema);
