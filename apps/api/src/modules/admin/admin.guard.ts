import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AdminService } from './admin.service';

const PERMISSION_KEY = 'bestwash.permission';
export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission);

export interface AdminRequest extends Request {
  admin: { adminId: string; sessionId: string; permissions: string[] };
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly admins: AdminService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const authorization = request.header('authorization');
    const cookies: unknown = request.cookies;
    const cookieToken =
      cookies && typeof cookies === 'object'
        ? (cookies as Record<string, unknown>).bw_admin_session
        : undefined;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : typeof cookieToken === 'string'
        ? cookieToken
        : '';
    request.admin = await this.admins.validateToken(token);
    const required = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required && !request.admin.permissions.includes(required)) {
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: 'دسترسی لازم برای این عملیات را ندارید.',
      });
    }
    return true;
  }
}
