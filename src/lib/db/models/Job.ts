import { createModel } from '../model';

export default createModel({
  table: 'jobs',
  json: ['payload'],
  dates: ['createdAt', 'updatedAt'],
});
