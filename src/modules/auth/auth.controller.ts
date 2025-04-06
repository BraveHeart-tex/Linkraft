import { Body, Controller, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { zodPipe } from 'src/pipes/zod.pipe.factory';
import {
  SignUpDto,
  SignUpSchema,
} from 'src/common/validation/schemas/sign-up.schema';
import {
  SignInDto,
  SignInSchema,
} from 'src/common/validation/schemas/sign-in.schema';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  signUp(
    @Body(zodPipe(SignUpSchema)) signUpDto: SignUpDto,
    @Res() response: Response
  ) {
    return this.authService.signUp(response, signUpDto);
  }

  @Post('sign-in')
  signIn(@Body(zodPipe(SignInSchema)) signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }
}
