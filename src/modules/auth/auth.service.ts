import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  signUp() {
    return 'sign-up';
  }
  signIn() {
    return 'sign-in';
  }
}
