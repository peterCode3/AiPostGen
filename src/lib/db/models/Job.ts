import { Schema, model, models } from 'mongoose';
const JobSchema = new Schema({
  type: String,
  payload: Schema.Types.Mixed,
  status: { type: String, enum: ['pending','active','succeeded','failed'], default: 'pending' },
  attempts: Number,
  error: String,
}, { timestamps: true });

export default models.Job || model('Job', JobSchema);
