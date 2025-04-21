import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { zodPipe } from 'src/pipes/zod.pipe.factory';
import {
  SignUpDto,
  SignUpSchema,
} from 'src/common/validation/schemas/auth/sign-up.schema';
import {
  SignInDto,
  SignInSchema,
} from 'src/common/validation/schemas/auth/sign-in.schema';
import { Response } from 'express';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { SessionValidationResult, UserSessionContext } from './session.types';
import { ApiException } from 'src/exceptions/api.exception';
import { ResponseStatus } from 'src/common/decorators/response-status.decorator';
import { AuthGuard } from 'src/guards/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  getAuthenticatedUser(@CurrentUser() userSessionInfo: UserSessionContext) {
    return {
      user: userSessionInfo.user,
    };
  }

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
        'You cannot sign-up when you are signed in',
        HttpStatus.BAD_REQUEST
      );
    }

    return this.authService.registerUserWithSession(response, signUpDto);
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
  @UseGuards(AuthGuard)
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
