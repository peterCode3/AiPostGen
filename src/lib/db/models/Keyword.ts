import { createModel } from '../model';

export default createModel({
  table: 'keywords',
  json: ['serp'],
  dates: ['usedAt', 'fetchedAt', 'createdAt', 'updatedAt'],
});
