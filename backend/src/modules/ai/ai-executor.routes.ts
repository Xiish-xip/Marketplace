import { Router, Request, Response } from 'express';
import { authenticate, authorize, asyncHandler } from '../../common/middleware';
import { advancedToolExecutor } from './ai-tool-executor.service';
import { prisma } from '../../common/prisma';

const router = Router();
const admin = [authenticate, authorize('ADMIN', 'SUPER_ADMIN')];

// ── Test execute a tool ──
router.post('/:id/test', ...admin, asyncHandler(async (req: Request, res: Response) => {
  const toolId = req.params.id;
  const { args } = req.body;
  const userId = (req as any).user?.userId;

  const result = await advancedToolExecutor.testExecute(toolId, args || {}, userId);
  res.json({ success: true, data: result });
}));

// ── Execute a tool directly ──
router.post('/:id/execute', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const toolId = req.params.id;
  const { args } = req.body;
  const user = (req as any).user;

  // Load tool and check permissions
  const tool = await prisma.aiTool.findUnique({ where: { id: toolId } });
  if (!tool || !tool.enabled) return res.status(404).json({ success: false, message: 'Tool not found or disabled' });

  const roles = tool.roles ? JSON.parse(tool.roles) : ['CUSTOMER'];
  if (!roles.includes(user.role) && !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return res.status(403).json({ success: false, message: 'Not authorized for this tool' });
  }

  const result = await advancedToolExecutor.execute({
    toolName: tool.name,
    toolId: tool.id,
    args: args || {},
    userId: user.userId,
    userRole: user.role,
  });

  res.json({ success: true, data: result });
}));

// ── Get handler type schemas (for UI editor) ──
router.get('/handler-schemas', ...admin, asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      handlerTypes: [
        {
          type: 'builtin',
          label: 'Built-in Handler',
          description: 'Uses a pre-registered TypeScript handler in the platform code',
          configFields: [],
          icon: 'FileCode',
        },
        {
          type: 'code',
          label: 'Custom Code',
          description: 'Run sandboxed JavaScript code with access to safe Prisma operations',
          icon: 'Code',
          configFields: [
            { key: 'code', label: 'JavaScript Code', type: 'code', required: true, placeholder: '// Write your tool logic here\n// Use: args.userId, args.someParam\n// Access: fetch(), prisma.product.findMany()\n\nconst products = await prisma.product.findMany({\n  where: { categoryId: args.categoryId },\n  take: 10\n});\n\nreturn { products, count: products.length };' },
            { key: 'timeout', label: 'Timeout (ms)', type: 'number', default: 10000 },
          ],
          example: `// Example: Get top-selling products
const products = await prisma.product.findMany({
  where: { isActive: true },
  orderBy: { totalSales: 'desc' },
  take: args.limit || 5,
  include: { category: true }
});
return { products, count: products.length };`,
        },
        {
          type: 'api',
          label: 'API Request',
          description: 'Make an HTTP request to an external API with template variables',
          icon: 'Globe',
          configFields: [
            { key: 'url', label: 'API URL', type: 'text', required: true, placeholder: 'https://api.example.com/v1/{{args.endpoint}}' },
            { key: 'method', label: 'HTTP Method', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], default: 'POST' },
            { key: 'headers', label: 'Custom Headers (JSON)', type: 'json', placeholder: '{"Authorization": "Bearer {{args.apiKey}}"}' },
            { key: 'body', label: 'Request Body Template (JSON)', type: 'json', placeholder: '{"query": "{{args.query}}", "limit": {{args.limit}} }' },
            { key: 'responseMapping', label: 'Response Mapping (JSON key→path)', type: 'json', placeholder: '{"title": "data.title", "price": "data.price"}' },
            { key: 'timeout', label: 'Timeout (ms)', type: 'number', default: 15000 },
          ],
          example: `// Example: Fetch weather data
Config: {
  "url": "https://api.weather.com/v1/current?city={{args.city}}",
  "method": "GET",
  "responseMapping": {
    "temperature": "main.temp",
    "humidity": "main.humidity",
    "description": "weather.0.description"
  }
}`,
        },
        {
          type: 'webhook',
          label: 'Webhook',
          description: 'POST tool arguments to an external webhook URL',
          icon: 'Zap',
          configFields: [
            { key: 'handlerRef', label: 'Webhook URL', type: 'text', required: true, placeholder: 'https://hooks.example.com/notify' },
          ],
        },
        {
          type: 'plugin',
          label: 'Plugin',
          description: 'Execute via a registered plugin slug',
          icon: 'Puzzle',
          configFields: [
            { key: 'handlerRef', label: 'Plugin Slug', type: 'text', required: true, placeholder: 'my-plugin-slug' },
          ],
        },
        {
          type: 'workflow',
          label: 'Workflow',
          description: 'Trigger an automation workflow',
          icon: 'Workflow',
          configFields: [
            { key: 'handlerRef', label: 'Workflow Slug', type: 'text', required: true, placeholder: 'order-fulfillment' },
          ],
        },
        {
          type: 'query',
          label: 'Database Query',
          description: 'Execute a safe Prisma query (ADMIN only)',
          icon: 'Database',
          configFields: [
            { key: 'model', label: 'Model Name', type: 'select', options: ['product', 'order', 'user', 'seller', 'category', 'review', 'brand', 'analyticsEvent'], required: true },
            { key: 'type', label: 'Query Type', type: 'select', options: ['findMany', 'findUnique', 'count', 'aggregate'], default: 'findMany' },
            { key: 'query', label: 'Query (JSON with {{arg}} templates)', type: 'json', required: true, placeholder: '{"where": {"isActive": true}, "take": {{args.limit}}}' },
          ],
          example: `// Example: Query top products
{
  "model": "product",
  "type": "findMany",
  "query": "{\"where\": {\"isActive\": true}, \"orderBy\": {\"totalSales\": \"desc\"}, \"take\": {{args.limit || 5}}}"
}`,
        },
        {
          type: 'ai',
          label: 'AI Prompt',
          description: 'Let AI generate a response based on a prompt template',
          icon: 'Bot',
          configFields: [
            { key: 'prompt', label: 'AI Prompt Template', type: 'textarea', required: true, placeholder: 'You are a helpful assistant. Given the following context, answer the user query.\n\nContext: The user {{args.userName}} is asking about {{args.query}}.\n\nProvide a helpful response with specific details and recommendations.' },
            { key: 'provider', label: 'AI Provider Slug (optional)', type: 'text', placeholder: 'openai' },
            { key: 'model', label: 'Model Slug (optional)', type: 'text', placeholder: 'gpt-4o-mini' },
            { key: 'temperature', label: 'Temperature', type: 'number', default: 0.7 },
            { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 1024 },
          ],
          example: `// Example: AI product recommendation
{
  "prompt": "Given these products: {{args.products}}. Recommend the best 3 for {{args.userNeed}} and explain why.",
  "temperature": 0.5,
  "maxTokens": 500
}`,
        },
      ],
    },
  });
}));

export default router;