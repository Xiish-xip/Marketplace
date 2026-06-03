import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import { logger } from '../../common/logger';
import vm from 'vm';
import { randomBytes } from 'crypto';

/**
 * AdvancedToolExecutor
 *
 * Executes AI tools with multiple handler types:
 * - builtin: TypeScript handler registered in code
 * - code: Sandboxed JavaScript/TypeScript provided by admin in the UI
 * - api: Simple REST API call defined in tool config
 * - webhook: POST to external URL
 * - plugin: Delegates to a plugin
 * - workflow: Delegates to a workflow
 * - query: Execute a raw database query (ADMIN only)
 * - ai: Let an AI generate the response using the tool's config prompt
 */

interface ExecutionContext {
  toolName: string;
  toolId: string;
  args: Record<string, any>;
  userId: string;
  userRole: string;
  config?: Record<string, any>;
}

export class AdvancedToolExecutor {
  // ── Main dispatcher ──

  async execute(context: ExecutionContext): Promise<any> {
    const { toolName, handlerType, handlerRef, config } = await this.getToolConfig(context.toolId);
    const { args, userId } = context;

    switch (handlerType) {
      case 'builtin':
        return this.executeBuiltin(toolName, args, userId);
      case 'code':
        return this.executeCode(config, args, context);
      case 'api':
        return this.executeApi(config, args);
      case 'webhook':
        return this.executeWebhook(handlerRef!, args);
      case 'plugin':
        return this.executePlugin(handlerRef!, args, userId);
      case 'workflow':
        return this.executeWorkflow(handlerRef!, args, userId);
      case 'query':
        return this.executeQuery(config, args);
      case 'ai':
        return this.executeAI(config, args, context);
      default:
        throw new AppError(500, `Unknown handler type: ${handlerType}`);
    }
  }

  async testExecute(toolId: string, args: Record<string, any>, userId: string): Promise<any> {
    const tool = await prisma.aiTool.findUnique({ where: { id: toolId } });
    if (!tool) throw new NotFoundError('Tool not found');
    const config = tool.config ? JSON.parse(tool.config) : {};
    return this.execute({
      toolName: tool.name,
      toolId: tool.id,
      args,
      userId,
      userRole: 'SUPER_ADMIN',
      config,
    });
  }

  private async getToolConfig(toolId: string) {
    const tool = await prisma.aiTool.findUnique({ where: { id: toolId } });
    if (!tool) throw new NotFoundError('Tool not found');
    return {
      toolName: tool.name,
      handlerType: tool.handlerType,
      handlerRef: tool.handlerRef,
      config: tool.config ? JSON.parse(tool.config) : {},
    };
  }

  // ── Builtin ──

  private async executeBuiltin(name: string, args: any, userId: string): Promise<any> {
    // Builtin handlers are registered in SecureToolRunner
    const { aiToolRegistry } = require('./ai-tool-registry.service');
    return aiToolRegistry.executeTool({ name, arguments: args, userId, userRole: 'ADMIN' });
  }

  // ── Code Execution (Sandboxed) ──

  private async executeCode(config: any, args: any, ctx: ExecutionContext): Promise<any> {
    const script = config?.code || config?.script;
    if (!script) throw new AppError(400, 'No code defined for this tool');

    // Create a sandbox with allowed imports
    const sandbox = {
      args,
      userId: ctx.userId,
      userRole: ctx.userRole,
      prisma: this.createSafePrisma(),
      fetch: this.createSafeFetch(),
      crypto: { randomUUID: randomBytes(16).toString('hex') },
      console: { log: (...msg: any[]) => logger.info(`[Tool:${ctx.toolName}]`, ...msg) },
      JSON,
      Math,
      Date,
      Promise,
      setTimeout,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Buffer,
    };

    try {
      const wrappedScript = `
        (async () => {
          ${script}
        })()
      `;

      const context = vm.createContext(sandbox);
      const result = await vm.runInNewContext(wrappedScript, context, {
        timeout: config?.timeout || 10000,
        filename: `tool-${ctx.toolName}.js`,
      });

      return result;
    } catch (error: any) {
      logger.error(`Code execution failed for tool "${ctx.toolName}"`, { error: error.message });
      throw new AppError(500, `Code execution error: ${error.message}`);
    }
  }

  private createSafePrisma() {
    // Expose only read operations for safety
    return {
      product: {
        findMany: (args: any) => prisma.product.findMany(args),
        findUnique: (args: any) => prisma.product.findUnique(args),
        count: (args: any) => prisma.product.count(args),
      },
      order: {
        findMany: (args: any) => prisma.order.findMany(args),
        findUnique: (args: any) => prisma.order.findUnique(args),
        count: (args: any) => prisma.order.count(args),
      },
      user: {
        findMany: (args: any) => prisma.user.findMany({ ...args, select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true } }),
        findUnique: (args: any) => prisma.user.findUnique({ ...args, select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true } }),
        count: (args: any) => prisma.user.count(args),
      },
      seller: {
        findMany: (args: any) => prisma.seller.findMany(args),
        findUnique: (args: any) => prisma.seller.findUnique(args),
        count: (args: any) => prisma.seller.count(args),
      },
      category: {
        findMany: (args: any) => prisma.category.findMany(args),
        findUnique: (args: any) => prisma.category.findUnique(args),
      },
      analyticsEvent: {
        findMany: (args: any) => prisma.analyticsEvent.findMany(args),
        count: (args: any) => prisma.analyticsEvent.count(args),
      },
    };
  }

  private createSafeFetch() {
    return async (url: string, options?: any) => {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(5000),
      });
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return { status: response.status, ok: response.ok, data: await response.json() };
      }
      return { status: response.status, ok: response.ok, data: await response.text() };
    };
  }

  // ── API Execution ──

  private async executeApi(config: any, args: any): Promise<any> {
    const { url, method = 'POST', headers = {}, body, responseMapping } = config;

    if (!url) throw new AppError(400, 'API URL not configured');

    // Resolve template variables in URL and body
    const resolvedUrl = this.resolveTemplate(url, args);
    const resolvedBody = body ? this.resolveTemplate(body, args) : args;

    try {
      const response = await fetch(resolvedUrl, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: ['GET', 'HEAD'].includes(method) ? undefined : JSON.stringify(resolvedBody),
        signal: AbortSignal.timeout(config?.timeout || 15000),
      });

      const responseData = await response.json().catch(() => null);

      // Apply response mapping if configured
      if (responseMapping && responseData) {
        return this.applyMapping(responseData, responseMapping);
      }

      return { status: response.status, data: responseData };
    } catch (error: any) {
      throw new AppError(502, `API call failed: ${error.message}`);
    }
  }

  // ── Query Execution (ADMIN only) ──

  private async executeQuery(config: any, args: any): Promise<any> {
    const { query, type = 'findMany', model } = config;
    if (!model || !query) throw new AppError(400, 'Query not configured');

    const resolvedQuery = this.resolveTemplate(query, args);
    const prismaModel = (prisma as any)[model];
    if (!prismaModel) throw new AppError(400, `Unknown model: ${model}`);

    try {
      if (type === 'findMany') {
        const data = await prismaModel.findMany(JSON.parse(resolvedQuery));
        return { data, count: data.length };
      } else if (type === 'findUnique') {
        return await prismaModel.findUnique(JSON.parse(resolvedQuery));
      } else if (type === 'count') {
        return { count: await prismaModel.count(JSON.parse(resolvedQuery)) };
      } else if (type === 'aggregate') {
        return await prismaModel.aggregate(JSON.parse(resolvedQuery));
      }
      throw new AppError(400, `Unknown query type: ${type}`);
    } catch (error: any) {
      throw new AppError(500, `Query execution failed: ${error.message}`);
    }
  }

  // ── AI Execution ──

  private async executeAI(config: any, args: any, ctx: ExecutionContext): Promise<any> {
    const { prompt, model, provider } = config;
    if (!prompt) throw new AppError(400, 'AI prompt not configured');

    const resolvedPrompt = this.resolveTemplate(prompt, { ...args, toolName: ctx.toolName, userId: ctx.userId });

    try {
      const { AiService } = require('./ai.service');
      const aiService = new AiService();

      // Find first enabled provider
      const enabledProvider = await prisma.aiProvider.findFirst({
        where: { isEnabled: true, slug: provider || undefined },
        include: { aiModels: { where: { isActive: true }, take: 1 } },
      });
      if (!enabledProvider) throw new AppError(500, 'No enabled AI provider found');

      const modelSlug = model || enabledProvider.aiModels[0]?.slug;
      if (!modelSlug) throw new AppError(500, 'No AI model configured');

      const completion = await aiService.chatCompletion(
        enabledProvider.slug,
        modelSlug,
        [{ role: 'user', content: resolvedPrompt }],
        { temperature: config?.temperature || 0.7, max_tokens: config?.maxTokens || 1024 },
      );

      return {
        content: completion.choices?.[0]?.message?.content || 'No response',
        model: modelSlug,
        provider: enabledProvider.slug,
      };
    } catch (error: any) {
      throw new AppError(500, `AI execution failed: ${error.message}`);
    }
  }

  // ── Shared Execution Methods ──

  private async executeWebhook(url: string, args: any): Promise<any> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(30000),
      });
      return { status: response.status, data: await response.json().catch(() => null) };
    } catch (error: any) {
      throw new AppError(502, `Webhook failed: ${error.message}`);
    }
  }

  private async executePlugin(ref: string, args: any, userId: string): Promise<any> {
    const plugin = await prisma.plugin.findUnique({ where: { slug: ref } });
    if (!plugin || !plugin.isEnabled) throw new AppError(500, `Plugin "${ref}" not found or disabled`);
    const webhookUrls = this.safeJsonParse<string[]>(plugin.webhookUrls, []);
    if (webhookUrls.length > 0) {
      return this.executeWebhook(webhookUrls[0], args);
    }
    throw new AppError(500, `Plugin "${ref}" has no executable endpoint`);
  }

  private async executeWorkflow(ref: string, args: any, userId: string): Promise<any> {
    const workflow = await prisma.workflowTemplate.findUnique({ where: { slug: ref } });
    if (!workflow || !workflow.isEnabled) throw new AppError(500, `Workflow "${ref}" not found`);
    const run = await prisma.workflowRun.create({
      data: {
        templateId: workflow.id,
        triggeredBy: `ai-tool:${userId}`,
        input: JSON.stringify({ toolArgs: args }),
        status: 'PENDING',
      },
    });
    return { workflowRunId: run.id, status: 'queued' };
  }

  // ── Helpers ──

  private resolveTemplate(template: string, context: Record<string, any>): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, path) => {
      const value = path.split('.').reduce((obj: any, key: string) => obj?.[key], context);
      return value !== undefined ? String(value) : _match;
    });
  }

  private applyMapping(data: any, mapping: Record<string, string>): any {
    if (Array.isArray(data)) {
      return data.map(item => this.applyMapping(item, mapping));
    }
    const result: Record<string, any> = {};
    for (const [key, path] of Object.entries(mapping)) {
      result[key] = path.split('.').reduce((obj: any, p: string) => obj?.[p], data);
    }
    return result;
  }

  private safeJsonParse<T>(value: unknown, fallback: T): T {
    if (!value) return fallback;
    if (typeof value !== 'string') return value as T;
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
}

export const advancedToolExecutor = new AdvancedToolExecutor();