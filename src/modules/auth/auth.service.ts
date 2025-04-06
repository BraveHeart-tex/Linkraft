import { Injectable } from '@nestjs/common';
import { SignInDto } from 'src/common/validation/schemas/sign-in.schema';
import { SignUpDto } from 'src/common/validation/schemas/sign-up.schema';
import { SessionService } from './session.service';
import { generateSessionToken } from './utils/token.utils';
import { UserService } from '../user/user.service';
import { hashPassword } from './utils/password.utils';

@Injectable()
export class AuthService {
  constructor(
    private sessionService: SessionService,
    private userService: UserService
  ) {}
  async signUp(signUpDto: SignUpDto) {
    const passwordHash = await hashPassword(signUpDto.password);
    const createdUser = await this.userService.createUser({
      email: signUpDto.email,
      passwordHash,
    });

    const token = generateSessionToken();
    await this.sessionService.createSession(token, createdUser.id);
  }
  signIn(signInDto: SignInDto) {
    return signInDto;
  }
}
