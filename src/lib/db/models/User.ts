import { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
  email: { type: String, unique: true },
  name: String,
  role: { type: String, enum: ['admin','editor','contributor','viewer'], default: 'viewer' },
  provider: { type: String, default: 'credentials' }
}, { timestamps: true });

export default models.User || model('User', UserSchema);
