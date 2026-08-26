import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';

export interface AuthenticatedRequest extends Request {
  auth: { customerId: string; sessionId: string };
}

export function customerTokenFromRequest(request: Request): string {
  const authorization = request.header('authorization');
  const cookies: unknown = request.cookies;
  const cookieToken =
    cookies && typeof cookies === 'object'
      ? (cookies as Record<string, unknown>).bw_session
      : undefined;

  return authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : typeof cookieToken === 'string'
      ? cookieToken
      : '';
}

@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.auth = await this.auth.validateToken(
      customerTokenFromRequest(request),
    );
    return true;
  }
}
