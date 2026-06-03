import jwt from 'jsonwebtoken';
import { Request } from 'express';
import { config } from '../../common/config';
import { AuthPayload } from '../../common/middleware';

export class JwtAuthGuard {
  canActivate(request: Request): boolean {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = jwt.verify(token, config.jwtSecret) as AuthPayload;
      request.user = payload;
      return true;
    } catch {
      return false;
    }
  }
}
