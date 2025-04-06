import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { UserInsertDto } from 'src/db/schema';

@Injectable()
export class UserService {
  constructor(private userRepo: UserRepository) {}

  createUser(userDto: UserInsertDto) {
    return this.userRepo.insertUser(userDto);
  }
}
