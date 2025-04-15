import { Session, User, UserWithoutPasswordHash } from 'src/db/schema';

export type SessionValidationResult =
  | { session: Session; user: User }
  | { session: null; user: null };

export type UserSessionContext = {
  session: Session;
  user: UserWithoutPasswordHash;
};
