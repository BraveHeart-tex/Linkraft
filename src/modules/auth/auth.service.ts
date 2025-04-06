import { Injectable } from '@nestjs/common';
import { SignInDto } from 'src/common/validation/schemas/sign-in.schema';
import { SignUpDto } from 'src/common/validation/schemas/sign-up.schema';

@Injectable()
export class AuthService {
  signUp(signUpDto: SignUpDto) {
    return signUpDto;
  }
  signIn(signInDto: SignInDto) {
    return signInDto;
  }
}
