import { createUser } from './create';
import { listUsers } from './list';
import { deleteUser } from './delete';

export const userService = {
  create: createUser,
  list: listUsers,
  delete: deleteUser,
};