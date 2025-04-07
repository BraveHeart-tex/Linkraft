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
import { ResponseMessage } from 'src/common/response-message.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  @ResponseMessage('Signed up successfully')
  signUp(
    @Body(zodPipe(SignUpSchema)) signUpDto: SignUpDto,
    @Res({
      passthrough: true,
    })
    response: Response
  ) {
    return this.authService.signUp(response, signUpDto);
  }

  @Post('sign-in')
  @ResponseMessage('Signed in successfully')
  signIn(
    @Body(zodPipe(SignInSchema)) signInDto: SignInDto,
    @Res({
      passthrough: true,
    })
    response: Response
  ) {
    return this.authService.signIn(response, signInDto);
  }
}
