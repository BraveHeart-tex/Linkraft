import { PublicRoute } from '@/common/decorators/public-route.decorator';
import { Body, Controller, Get, HttpStatus, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { ResponseStatus } from 'src/common/decorators/response-status.decorator';
import {
  SignInInput,
  SignInSchema,
} from 'src/common/validation/schemas/auth/sign-in.schema';
import {
  SignUpInput,
  SignUpSchema,
} from 'src/common/validation/schemas/auth/sign-up.schema';
import { ApiException } from 'src/exceptions/api.exception';
import { zodPipe } from 'src/pipes/zod.pipe.factory';
import { AuthService } from './auth.service';
import { SessionValidationResult, UserSessionContext } from './session.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  getAuthenticatedUser(@CurrentUser() userSessionInfo: UserSessionContext) {
    return {
      user: userSessionInfo.user,
    };
  }

  @Post('sign-up')
  @PublicRoute()
  @ResponseMessage('Signed up successfully')
  signUp(
    @Body(zodPipe(SignUpSchema)) signUpDto: SignUpInput,
    @Res({
      passthrough: true,
    })
    response: Response,
    @CurrentUser() userSessionInfo: SessionValidationResult
  ) {
    if (userSessionInfo.user || userSessionInfo.session) {
      throw new ApiException(
        'You cannot sign-up when you are signed in',
        HttpStatus.BAD_REQUEST
      );
    }

    return this.authService.registerUserWithSession(response, signUpDto);
  }

  @Post('sign-in')
  @PublicRoute()
  @ResponseMessage('Signed in successfully')
  signIn(
    @Body(zodPipe(SignInSchema)) signInDto: SignInInput,
    @Res({
      passthrough: true,
    })
    response: Response,
    @CurrentUser() userSessionInfo: SessionValidationResult
  ) {
    if (userSessionInfo.user || userSessionInfo.session) {
      throw new ApiException(
        'You are already signed in',
        HttpStatus.BAD_REQUEST
      );
    }

    return this.authService.authenticateUserAndCreateSession(
      response,
      signInDto
    );
  }

  @Post('sign-out')
  @ResponseMessage('Signed out successfully')
  @ResponseStatus(HttpStatus.OK)
  signOut(
    @Res({
      passthrough: true,
    })
    response: Response,
    @CurrentUser() userSessionInfo: UserSessionContext
  ) {
    return this.authService.logoutUser(response, userSessionInfo.session.id);
  }
}
