import { Request } from 'express';
import { Role } from './role.enum';

export class RolesGuard {
  constructor(private requiredRoles: Role[] = []) {}

  canActivate(request: Request, requiredRoles: Role[] = this.requiredRoles): boolean {
    if (!requiredRoles.length) {
      return true;
    }
    const user = request.user;
    return !!user && requiredRoles.includes(user.role as Role);
  }
}
