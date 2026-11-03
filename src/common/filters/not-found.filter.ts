import {
  ExceptionFilter,
  Catch,
  NotFoundException,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(NotFoundException)
export class NotFoundFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isApi =
      request.url.startsWith('/products/api') ||
      (request.headers.accept && request.headers.accept.includes('application/json')) ||
      request.xhr;

    if (isApi) {
      return response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: `Resource not found: ${request.method} ${request.url}`,
        error: 'Not Found',
      });
    }

    const requestedUrl = request.originalUrl || request.url;

    return response.status(HttpStatus.NOT_FOUND).render('404', {
      title: '404 - Page Not Found',
      currentPage: '404',
      requestedUrl,
      shopName: process.env.SHOP_NAME || 'HARDWARE HUB',
      currentUser: (request as any).user || null,
    });
  }
}

