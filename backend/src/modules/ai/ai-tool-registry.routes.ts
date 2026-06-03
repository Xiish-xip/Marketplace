import { Router, Request, Response } from 'express';
import { authenticate, authorize, asyncHandler } from '../../common/middleware';
import { prisma } from '../../common/prisma';
import { AppError } from '../../common/errors';
import { logger } from '../../common/logger';
import { AiToolRegistry } from './ai-tool-registry.service';

const router = Router();
const registry = new AiToolRegistry();

// ── Tool Registry CRUD ──

router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const { category, enabled, role, riskLevel, search, page, limit } = req.query;
  const result = await registry.listTools({
    category: category as string,
    enabled: enabled === 'true' ? true : enabled === 'false' ? false : undefined,
    role: role as string,
    riskLevel: riskLevel as string,
    search: search as string,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });
  res.json({ success: true, ...result });
}));

// ── Audit Logs ──

router.get('/audit-logs', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const { toolName, userId, limit, page } = req.query;
  const where: any = {};
  if (toolName) where.toolName = toolName;
  if (userId) where.userId = userId;

  const [logs, total] = await Promise.all([
    prisma.aiToolAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: page ? (Number(page) - 1) * Number(limit || 20) : 0,
      take: Number(limit || 20),
    }),
    prisma.aiToolAuditLog.count({ where }),
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: {
      page: Number(page || 1),
      limit: Number(limit || 20),
      total,
      totalPages: Math.ceil(total / Number(limit || 20)),
    },
  });
}));

router.get('/name/:name', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const tool = await registry.getToolByName(req.params.name);
  res.json({ success: true, data: tool });
}));

router.get('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const tool = await registry.getToolById(req.params.id);
  res.json({ success: true, data: tool });
}));

router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const tool = await registry.createTool(req.body as any);
  res.status(201).json({ success: true, data: tool });
}));

router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const tool = await registry.updateTool(req.params.id, req.body);
  res.json({ success: true, data: tool });
}));

router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const result = await registry.deleteTool(req.params.id);
  res.json({ success: true, ...result });
}));

// ── Tool Permissions ──

router.post('/:id/permissions', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const { role, canExecute, canApprove } = req.body;
  const permission = await registry.setToolPermission(req.params.id, role, { canExecute, canApprove });
  res.status(201).json({ success: true, data: permission });
}));

router.get('/:id/permissions', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const permissions = await registry.getToolPermissions(req.params.id);
  res.json({ success: true, data: permissions });
}));

// ─────────────────────────────────────────────────────────────────────────────
// Admin Approval / Deny gates for AI write actions
// ─────────────────────────────────────────────────────────────────────────────

router.post('/:id/approve', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const approverUserId = (req as any).user?.userId;
  const approverRole = (req as any).user?.role;
  const auditLogId = req.params.id;

  // 1. Load audit log entry
  const auditLog = await prisma.aiToolAuditLog.findUnique({
    where: { id: auditLogId },
  });
  if (!auditLog) throw new AppError(404, 'Audit log entry not found');
  if (auditLog.status !== 'pending') {
    return res.json({ success: false, message: `Not pending approval — status: ${auditLog.status}` });
  }

  // 2. Verify approver role — load tool and its permissions separately
  const aiTool = auditLog.toolId
    ? await prisma.aiTool.findUnique({
        where: { id: auditLog.toolId },
        include: { permissions: true },
      })
    : await prisma.aiTool.findUnique({
        where: { name: auditLog.toolName },
        include: { permissions: true },
      });
  const approverPerm = aiTool?.permissions?.find(
    (p: any) => p.role === approverRole || ['ADMIN', 'SUPER_ADMIN'].includes(p.role)
  );
  if (!approverPerm?.canApprove && !['ADMIN', 'SUPER_ADMIN'].includes(approverRole!)) {
    throw new AppError(403, 'You do not have approval permissions for this action');
  }

  // 3. Execute the tool (skip confirmation gate — already approved)
  let executedResult: any;
  try {
    executedResult = await registry.approveToolCall(auditLogId, approverUserId, approverRole || 'SUPER_ADMIN');
  } catch (execErr: any) {
    await prisma.aiToolAuditLog.update({
      where: { id: auditLogId },
      data: { approvedBy: approverUserId, status: 'error', result: JSON.stringify({ error: execErr.message }) },
    });
    return res.json({ success: false, message: `Execution failed: ${execErr.message}`, result: null });
  }

  // 5. Fire off a second chat round so the assistant narrator explains what changed
  try {
    const { AIChatService } = await import('../chat/ai-chat.service');
    const chatService = new AIChatService();
    const conversation = await prisma.chatConversation.findFirst({
      where: { userId: auditLog.userId || approverUserId },
      orderBy: { updatedAt: 'desc' },
    });
    if (conversation) {
      const outcome = executedResult.success
        ? `${auditLog.toolName} completed successfully: ${JSON.stringify(executedResult.result || {}).slice(0, 400)}`
        : `${auditLog.toolName} failed: ${executedResult.error}`;
      // fire-and-forget — don't block the response
      chatService.sendAIMessage(conversation.id, approverUserId,
        `[SYSTEM] Action "${auditLog.toolName}" was approved and executed by ${approverRole}. Result: ${outcome}`
      ).catch(() => {});
    }
  } catch { /* background narration is best-effort */ }

  res.json({
    success: true,
    message: `"${auditLog.toolName}" has been approved and executed.`,
    result: executedResult.result,
  });
}));

router.post('/:id/deny', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const approverUserId = (req as any).user?.userId;
  const { reason = 'No reason provided' } = req.body;
  const auditLogId = req.params.id;

  const auditLog = await prisma.aiToolAuditLog.findUnique({ where: { id: auditLogId } });
  if (!auditLog) throw new AppError(404, 'Audit log entry not found');
  if (auditLog.status !== 'pending') {
    return res.json({ success: false, message: `Not pending — status: ${auditLog.status}` });
  }

  await prisma.aiToolAuditLog.update({
    where: { id: auditLogId },
    data: { approvedBy: approverUserId, status: 'denied', result: JSON.stringify({ deniedBy: approverUserId, reason }) },
  });

  logger.info('AI tool denied', { auditLogId, toolName: auditLog.toolName, approverUserId, reason });
  res.json({ success: true, message: `"${auditLog.toolName}" was denied.`, reason });
}));

export default router;
