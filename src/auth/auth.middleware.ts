import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { verifyToken, AuthPayload } from './token.util';

function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookieStr) => {
    const parts = cookieStr.split('=');
    const key = parts[0]?.trim();
    if (key) {
      list[key] = decodeURIComponent(parts.slice(1).join('=').trim());
    }
  });
  return list;
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies['auth_token'];
    const user: AuthPayload | null = token ? verifyToken(token) : null;

    (req as any).user = user;
    res.locals.currentUser = user;

    // Use originalUrl to get the true full client path
    const urlPath = (req.originalUrl || req.url || '').split('?')[0].trim();
    const cleanPath = urlPath === '/' ? '/' : urlPath.replace(/\/+$/, '') || '/';

    // Allow static files
    const isStaticAsset =
      cleanPath.startsWith('/css') ||
      cleanPath.startsWith('/js') ||
      cleanPath.startsWith('/favicon') ||
      /\.(css|js|png|jpg|jpeg|svg|gif|ico|woff|woff2|ttf|map)$/i.test(cleanPath);

    if (isStaticAsset) {
      return next();
    }

    // Public routes (login, logout, 404 page)
    const isPublicRoute =
      cleanPath === '/login' ||
      cleanPath.startsWith('/login') ||
      cleanPath === '/logout' ||
      cleanPath.startsWith('/logout') ||
      cleanPath === '/404' ||
      cleanPath.startsWith('/404');

    if (isPublicRoute) {
      // If user is already authenticated and visits /login, redirect to /dashboard
      if (user && cleanPath === '/login' && req.method === 'GET') {
        return res.redirect('/dashboard');
      }
      return next();
    }

    // Root path handling
    if (cleanPath === '/' || cleanPath === '') {
      if (user) {
        return res.redirect('/dashboard');
      }
      return res.redirect('/login');
    }

    // All other routes require authentication
    if (!user) {
      const isApi =
        cleanPath.startsWith('/products/api') ||
        (req.headers.accept && req.headers.accept.includes('application/json')) ||
        req.xhr;

      if (isApi) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Please sign in to access this resource.',
          redirectUrl: '/login',
        });
      }

      const redirectTarget =
        req.originalUrl &&
        req.originalUrl !== '/' &&
        !req.originalUrl.startsWith('/login') &&
        !req.originalUrl.startsWith('/logout')
          ? req.originalUrl
          : '';

      const loginUrl = redirectTarget
        ? `/login?redirect=${encodeURIComponent(redirectTarget)}`
        : '/login';

      return res.redirect(loginUrl);
    }

    return next();
  }
}
