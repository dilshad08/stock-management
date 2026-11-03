import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  Query,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('login')
  getLoginPage(
    @Req() req: Request,
    @Res() res: Response,
    @Query('error') error?: string,
    @Query('success') success?: string,
    @Query('redirect') redirect?: string,
  ) {
    // If already authenticated, redirect to dashboard
    if ((req as any).user) {
      return res.redirect('/dashboard');
    }

    return res.render('login', {
      title: 'Sign In',
      errorMessage: error || null,
      successMessage: success || null,
      redirectUrl: redirect || '/dashboard',
      enteredUsername: '',
    });
  }

  @Post('login')
  async handleLogin(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const username = (body.username || '').trim();
    const password = body.password || '';
    const redirectUrl = body.redirectUrl || '/dashboard';

    const user = await this.authService.validateUser(username, password);

    if (!user) {
      return res.status(401).render('login', {
        title: 'Sign In',
        errorMessage: 'Invalid username or password. Please try again.',
        successMessage: null,
        redirectUrl,
        enteredUsername: username,
      });
    }

    const token = this.authService.generateAuthToken(user);

    // Set secure HTTP-only session cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });

    return res.redirect(redirectUrl.startsWith('/') ? redirectUrl : '/dashboard');
  }

  @Get('logout')
  handleLogout(@Res() res: Response) {
    res.clearCookie('auth_token', { path: '/' });
    return res.redirect('/login?success=You+have+been+logged+out+successfully.');
  }
}
