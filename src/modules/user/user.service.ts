import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { User, UserInsertDto } from 'src/db/schema';

@Injectable()
export class UserService {
  constructor(private userRepo: UserRepository) {}

  signUpUser(userDto: UserInsertDto): Promise<User> {
    return this.userRepo.create(userDto);
  }

  getUserByEmail(email: string): Promise<User | undefined> {
    return this.userRepo.findByEmail(email);
  }
}
