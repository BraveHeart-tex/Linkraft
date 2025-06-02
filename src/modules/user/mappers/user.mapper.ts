import { User, UserWithoutPasswordHash } from 'src/db/schema';

export const toUserWithoutPassword = (
  user: User | UserWithoutPasswordHash
): UserWithoutPasswordHash => {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    profilePicture: user.profilePicture,
    visibleName: user.visibleName,
  };
};
