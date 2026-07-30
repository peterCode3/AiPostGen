import { createModel } from '../model';

export default createModel({
  table: 'sources',
  json: ['metadata'],
  dates: ['usedAt', 'fetchedAt', 'createdAt', 'updatedAt'],
});
