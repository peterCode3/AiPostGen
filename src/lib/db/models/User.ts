import { createModel } from '../model';

export default createModel({
  table: 'users',
  dates: ['createdAt', 'updatedAt'],
});
