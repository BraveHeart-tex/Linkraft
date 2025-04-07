import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
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
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { SessionValidationResult } from './session.types';
import { ApiException } from 'src/exceptions/api.exception';

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
    response: Response,
    @CurrentUser() userSessionInfo: SessionValidationResult
  ) {
    if (userSessionInfo.user || userSessionInfo.session) {
      throw new ApiException(
        'BAD_REQUEST',
        'You cannot sign-up when you are signed in',
        HttpStatus.BAD_REQUEST,
        null
      );
    }

    return this.authService.signUp(response, signUpDto);
  }

  @Post('sign-in')
  @ResponseMessage('Signed in successfully')
  signIn(
    @Body(zodPipe(SignInSchema)) signInDto: SignInDto,
    @Res({
      passthrough: true,
    })
    response: Response,
    @CurrentUser() userSessionInfo: SessionValidationResult
  ) {
    if (userSessionInfo.user || userSessionInfo.session) {
      throw new ApiException(
        'BAD_REQUEST',
        'You are already signed in',
        HttpStatus.BAD_REQUEST,
        null
      );
    }

    return this.authService.signIn(response, signInDto);
  }
}
