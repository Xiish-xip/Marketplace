import { prisma } from './prisma';
import { logger } from './logger';
import { Request } from 'express';
import { getIO } from './socket';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'VERIFY' | 'REJECT' | 'PAYMENT' | 'SETTINGS';
export type AuditEntity = 'USER' | 'PRODUCT' | 'ORDER' | 'PAYMENT' | 'SETTINGS' | 'ROLE' | 'AI' | 'CACHE' | 'TRANSLATION' | 'SELLER' | 'CATEGORY' | 'PROMOTION' | 'REVIEW' | 'CART' | 'BRAND' | 'BLOG' | 'ANNOUNCEMENT' | 'TICKET' | 'PLUGIN' | 'API_KEY' | 'GIFTCARD' | 'WORKFLOW' | 'AUDIT' | 'SYSTEM';

export interface AuditLogInput {
  userId?: string | null;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Create an audit log entry and emit it via WebSocket for real-time consumption.
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const log = await prisma.auditLog.create({
      data: {
        userId: input.userId || null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId || null,
        details: input.details || null,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Emit via WebSocket for real-time updates
    try {
      const socketIo = getIO();
      if (socketIo) {
        socketIo.to('admin-room').emit('audit-event', log);
      }
    } catch {
      // Socket may not be initialized yet
    }
  } catch (error) {
    logger.error('Failed to create audit log', { error: (error as Error).message, input });
  }
}

/**
 * Extract IP and user agent from Express request
 */
export function extractRequestInfo(req: Request): { ipAddress: string | null; userAgent: string | null } {
  return {
    ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || null,
    userAgent: (req.headers['user-agent'] as string) || null,
  };
}

/**
 * Create an audit log from an Express request context
 */
export async function auditLogFromRequest(
  req: Request,
  action: AuditAction,
  entity: AuditEntity,
  entityId?: string | null,
  details?: string | null,
): Promise<void> {
  const user = (req as any).user;
  const { ipAddress, userAgent } = extractRequestInfo(req);
  
  await createAuditLog({
    userId: user?.userId || null,
    action,
    entity,
    entityId,
    details,
    ipAddress,
    userAgent,
  });
}

/**
 * Simple helper to log system-level audits (no user context)
 */
export async function systemAuditLog(
  action: AuditAction,
  entity: AuditEntity,
  entityId?: string | null,
  details?: string | null,
): Promise<void> {
  await createAuditLog({
    userId: null,
    action,
    entity,
    entityId,
    details,
    ipAddress: null,
    userAgent: null,
  });
}