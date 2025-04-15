import { User, UserWithoutPasswordHash } from 'src/db/schema';

export const toUserWithoutPassword = (user: User): UserWithoutPasswordHash => {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    isActive: user.isActive,
    profilePicture: user.profilePicture,
    visibleName: user.visibleName,
  };
};
