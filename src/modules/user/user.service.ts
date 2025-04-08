import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { User, UserInsertDto } from 'src/db/schema';

@Injectable()
export class UserService {
  constructor(private userRepo: UserRepository) {}

  createUser(userDto: UserInsertDto): Promise<User> {
    return this.userRepo.insertUser(userDto);
  }

  findUserByEmail(email: string): Promise<User | undefined> {
    return this.userRepo.findUserByEmail(email);
  }
}
