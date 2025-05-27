import { Session, UserWithoutPasswordHash } from 'src/db/schema';

export type SessionValidationResult =
  | { session: Session; user: UserWithoutPasswordHash }
  | { session: null; user: null };

export type UserSessionContext = {
  session: Session;
  user: UserWithoutPasswordHash;
};
