import { prisma } from '../../common/prisma';
import crypto from 'crypto';
import { NotFoundError, AppError } from '../../common/errors';
import { logger } from '../../common/logger';
import { encrypt } from '../../common/encryption';
import { secretService } from './ai-secret.service';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

interface StreamCallbacks {
  onThinking?: (text: string) => void;
  onContent?: (text: string) => void;
  onToolCall?: (toolCall: any) => void;
  onDone?: (result: { content: string; thinking: string; model?: string; tokens?: number }) => void;
  onError?: (error: string) => void;
}

// ── Circuit Breaker ──
interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

class CircuitBreaker {
  private state: Map<string, CircuitState> = new Map();
  private readonly failureThreshold = 5;
  private readonly resetTimeout = 120000; // 120s
  private readonly halfOpenMaxRequests = 1;

  async call<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const circuit = this.state.get(key) || { failures: 0, lastFailure: 0, state: 'CLOSED' as const };

    if (circuit.state === 'OPEN') {
      if (Date.now() - circuit.lastFailure > this.resetTimeout) {
        circuit.state = 'HALF_OPEN';
        this.state.set(key, circuit);
      } else {
        throw new AppError(503, `AI provider "${key}" is temporarily unavailable (circuit open)`);
      }
    }

    try {
      const result = await fn();
      // Success - reset circuit
      this.state.set(key, { failures: 0, lastFailure: 0, state: 'CLOSED' });
      return result;
    } catch (error: any) {
      circuit.failures++;
      circuit.lastFailure = Date.now();
      if (circuit.failures >= this.failureThreshold) {
        circuit.state = 'OPEN';
        logger.warn(`Circuit breaker OPEN for "${key}" after ${circuit.failures} failures`);
      }
      this.state.set(key, circuit);
      throw error;
    }
  }

  getStatus(key: string): { state: string; failures: number } {
    const circuit = this.state.get(key);
    if (!circuit) return { state: 'CLOSED', failures: 0 };
    return { state: circuit.state, failures: circuit.failures };
  }

  reset(key: string) {
    this.state.delete(key);
  }
}

const circuitBreaker = new CircuitBreaker();

// ── Retry with Exponential Backoff ──
async function withRetry<T>(fn: () => Promise<T>, options: { maxRetries?: number; baseDelay?: number; context?: string } = {}): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelay = options.baseDelay ?? 1000;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // Don't retry on auth errors or validation errors
      if (error instanceof AppError && (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 400)) {
        throw error;
      }
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt); // 1s, 2s, 4s
        logger.warn(`Retry ${attempt + 1}/${maxRetries} for ${options.context || 'AI request'} after ${delay}ms: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export class AiService {
  /**
   * Health check for a provider
   */
  async checkProviderHealth(providerId: string): Promise<{ success: boolean; circuit: { state: string; failures: number }; provider: any }> {
    const provider = await prisma.aiProvider.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundError('AI provider not found');
    const status = circuitBreaker.getStatus(provider.slug);
    return { success: status.state === 'CLOSED', circuit: status, provider: this.sanitizeProvider(provider) };
  }

  /**
   * Reset circuit breaker for a provider
   */
  async resetProviderCircuit(providerSlug: string): Promise<void> {
    circuitBreaker.reset(providerSlug);
  }
  /**
   * Get a decrypted API key for a provider, ready for use in HTTP requests.
   */
  private async getDecryptedApiKey(providerId: string): Promise<string | null> {
    return secretService.retrieveProviderKey(providerId);
  }
  // ── Provider CRUD ──

  async createProvider(data: {
    name: string;
    slug: string;
    provider: string;
    baseUrl?: string;
    apiKey?: string;
    models?: string[];
    config?: Record<string, any>;
  }) {
    const trimmedName = data.name.trim();
    const trimmedSlug = data.slug.trim();
    const trimmedBaseUrl = data.baseUrl?.trim();
    const trimmedApiKey = data.apiKey?.trim();

    const existing = await prisma.aiProvider.findFirst({
      where: { OR: [{ name: trimmedName }, { slug: trimmedSlug }] },
    });
    if (existing) throw new AppError(409, 'Provider with this name or slug already exists');

    const provider = await prisma.aiProvider.create({
      data: {
        name: trimmedName,
        slug: trimmedSlug,
        provider: data.provider,
        baseUrl: trimmedBaseUrl || null,
        apiKey: trimmedApiKey ? encrypt(trimmedApiKey) : null,
        models: JSON.stringify(data.models || []),
        config: data.config ? JSON.stringify(data.config) : null,
      },
    });
    return this.sanitizeProvider(provider);
  }

  async updateProvider(id: string, data: {
    name?: string;
    provider?: string;
    baseUrl?: string;
    apiKey?: string;
    models?: string[];
    config?: Record<string, any>;
    isEnabled?: boolean;
  }) {
    const existing = await prisma.aiProvider.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('AI provider not found');

    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.provider !== undefined) updateData.provider = data.provider;
    if (data.baseUrl !== undefined) updateData.baseUrl = data.baseUrl?.trim();
    if (data.apiKey !== undefined) {
      const trimmedApiKey = data.apiKey.trim();
      if (trimmedApiKey) {
        updateData.apiKey = encrypt(trimmedApiKey);
      }
    }
    if (data.models !== undefined) updateData.models = JSON.stringify(data.models);
    if (data.config !== undefined) updateData.config = JSON.stringify(data.config);
    if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;

    const updated = await prisma.aiProvider.update({ where: { id }, data: updateData });
    return this.sanitizeProvider(updated);
  }

  async deleteProvider(id: string) {
    const existing = await prisma.aiProvider.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('AI provider not found');
    await prisma.aiProvider.delete({ where: { id } });
    return { success: true, message: 'AI provider deleted' };
  }

  async listProviders(query: { page?: number; limit?: number; isEnabled?: string }) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const where: Record<string, any> = {};

    if (query.isEnabled === 'true') where.isEnabled = true;
    if (query.isEnabled === 'false') where.isEnabled = false;

    const [providers, total] = await Promise.all([
      prisma.aiProvider.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { aiModels: true },
      }),
      prisma.aiProvider.count({ where }),
    ]);

    return {
      data: providers.map(p => ({ ...this.sanitizeProvider(p), aiModels: p.aiModels.map(m => this.sanitizeModel(m)) })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async toggleProvider(id: string) {
    const existing = await prisma.aiProvider.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('AI provider not found');
    const updated = await prisma.aiProvider.update({
      where: { id },
      data: { isEnabled: !existing.isEnabled },
    });
    return this.sanitizeProvider(updated);
  }

  // ── Model CRUD ──

  async createModel(data: {
    name: string;
    slug: string;
    providerId: string;
    capabilities?: string[];
    contextLength?: number;
    pricing?: Record<string, any>;
  }) {
    const provider = await prisma.aiProvider.findUnique({ where: { id: data.providerId } });
    if (!provider) throw new NotFoundError('AI provider not found');

    const model = await prisma.aiModel.create({
      data: {
        name: data.name,
        slug: data.slug,
        providerId: data.providerId,
        capabilities: JSON.stringify(data.capabilities || ['chat']),
        contextLength: data.contextLength || 4096,
        pricing: data.pricing ? JSON.stringify(data.pricing) : null,
      },
    });
    return this.sanitizeModel(model);
  }

  async updateModel(id: string, data: {
    name?: string;
    capabilities?: string[];
    contextLength?: number;
    pricing?: Record<string, any>;
    isActive?: boolean;
  }) {
    const existing = await prisma.aiModel.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('AI model not found');

    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.capabilities !== undefined) updateData.capabilities = JSON.stringify(data.capabilities);
    if (data.contextLength !== undefined) updateData.contextLength = data.contextLength;
    if (data.pricing !== undefined) updateData.pricing = JSON.stringify(data.pricing);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await prisma.aiModel.update({ where: { id }, data: updateData });
    return this.sanitizeModel(updated);
  }

  async deleteModel(id: string) {
    const existing = await prisma.aiModel.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('AI model not found');
    await prisma.aiModel.delete({ where: { id } });
    return { success: true, message: 'AI model deleted' };
  }

  async listModels(query: { page?: number; limit?: number; providerId?: string; isActive?: string }) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const where: Record<string, any> = {};

    if (query.providerId) where.providerId = query.providerId;
    if (query.isActive === 'true') where.isActive = true;
    if (query.isActive === 'false') where.isActive = false;

    const [models, total] = await Promise.all([
      prisma.aiModel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { provider: true },
      }),
      prisma.aiModel.count({ where }),
    ]);

    return {
      data: models.map(m => ({ ...this.sanitizeModel(m), provider: this.sanitizeProvider(m.provider) })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getModelsByProvider(providerSlug: string) {
    const provider = await prisma.aiProvider.findUnique({ where: { slug: providerSlug } });
    if (!provider) throw new NotFoundError('AI provider not found');

    const models = await prisma.aiModel.findMany({
      where: { providerId: provider.id, isActive: true },
      orderBy: { name: 'asc' },
    });

    return models.map(m => this.sanitizeModel(m));
  }

  // ── Connection & Model Fetching ──

  async testConnection(providerId: string) {
    const provider = await prisma.aiProvider.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundError('AI provider not found');

    const baseUrl = this.defaultBaseUrl(provider).trim();
    const apiKey = (await this.getDecryptedApiKey(providerId))?.trim() || null;
    const modelListUrl = this.modelListUrl(provider, baseUrl, apiKey);

    try {
      const response = await fetch(modelListUrl, {
        headers: this.providerAuthHeaders(provider, apiKey),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, status: response.status, message: `Connection failed: ${errorText}` };
      }

      return { success: true, message: 'Connection successful', status: response.status };
    } catch (error) {
      const err = error as Error & { cause?: any; code?: string };
      // Log detailed error info for debugging
      logger.error('AI provider connection test failed', {
        providerId,
        baseUrl,
        modelListUrl,
        error: err.message,
        code: err.code,
        cause: err.cause ? (err.cause as Error)?.message || String(err.cause) : undefined,
      });
      return { success: false, message: `Connection error: ${err.message}`, status: 0 };
    }
  }

  async fetchProviderModels(providerId: string) {
    const provider = await prisma.aiProvider.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundError('AI provider not found');

    const baseUrl = this.defaultBaseUrl(provider).trim();
    const apiKey = (await this.getDecryptedApiKey(providerId))?.trim() || null;
    const modelListUrl = this.modelListUrl(provider, baseUrl, apiKey);

    try {
      const response = await fetch(modelListUrl, {
        headers: this.providerAuthHeaders(provider, apiKey),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        return { success: false, models: [], message: `Failed to fetch models: ${response.statusText}` };
      }

       const data = await response.json() as any;
       const models = (data.data || data.models || []).map((m: any) => {
        const id = m.id || m.name?.replace(/^models\//, '') || m.name;
        return {
        id,
        name: id,
        slug: id.replace(/[.:/]/g, '-'),
        capabilities: ['chat'],
        contextLength: m.input_token_limit || m.context_length || 4096,
        owned_by: m.owned_by || '',
      };
      });

      // Auto-create models in database
      for (const modelData of models) {
        try {
          const existing = await prisma.aiModel.findFirst({
            where: { slug: modelData.slug, providerId: provider.id },
          });
          if (!existing) {
            await prisma.aiModel.create({
              data: {
                name: modelData.name,
                slug: modelData.slug,
                providerId: provider.id,
                capabilities: JSON.stringify(modelData.capabilities),
                contextLength: modelData.contextLength,
                isActive: true,
              },
            });
          }
        } catch {
          // Skip duplicates silently
        }
      }

      return { success: true, models, count: models.length };
    } catch (error) {
      return { success: false, models: [], message: `Error fetching models: ${(error as Error).message}` };
    }
  }

  // ── Chat Completion ──

  async chatCompletion(providerSlug: string, modelSlug: string, messages: ChatMessage[], options?: { temperature?: number; max_tokens?: number; stream?: boolean; tools?: any[] }) {
    const provider = await prisma.aiProvider.findUnique({ where: { slug: providerSlug } });
    if (!provider) throw new NotFoundError('AI provider not found');
    if (!provider.isEnabled) throw new AppError(400, 'AI provider is disabled');

    const model = await prisma.aiModel.findUnique({ where: { slug: modelSlug } });
    if (!model) throw new NotFoundError('AI model not found');
    if (!model.isActive) throw new AppError(400, 'AI model is not active');

    const baseUrl = this.defaultBaseUrl(provider);
    const apiKey = await this.getDecryptedApiKey(provider.id);
    const providerFormat = this.providerFormat(provider);
    const modelName = model.name || modelSlug;

    const body: any = {
      model: modelName,
      messages: messages.map(m => {
        const msg: any = { role: m.role };
        // Preserve tool_calls for assistant messages that contain them
        if ((m as any).tool_calls) {
          msg.tool_calls = (m as any).tool_calls;
        }
        // For tool role messages, content might be empty string
        if (m.role === 'tool') {
          msg.content = m.content;
          msg.tool_call_id = (m as any).tool_call_id;
        } else {
          msg.content = m.content;
        }
        return msg;
      }),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? Math.min(model.contextLength, 4096),
    };

    // Pass native function tools if provided
    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools;
      // Allow the model to decide when to call tools
      body.tool_choice = 'auto';
    }

    if (options?.stream) {
      body.stream = true;
    }

    if (providerFormat === 'anthropic') {
      const modelName = model.name || modelSlug;
      return circuitBreaker.call(provider.slug, () => withRetry(
        () => this.anthropicChatCompletion(baseUrl, apiKey, modelName, messages, options),
        { context: `anthropic:${provider.slug}` },
      ));
    }

    if (providerFormat === 'gemini') {
      const modelName = model.name || modelSlug;
      return circuitBreaker.call(provider.slug, () => withRetry(
        () => this.geminiChatCompletion(baseUrl, apiKey, modelName, messages, options),
        { context: `gemini:${provider.slug}` },
      ));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey ? `Bearer ${apiKey}` : '',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

       if (!response.ok) {
         const errorText = await response.text();
         throw new AppError(response.status, `AI provider error: ${errorText}`);
       }

       if (options?.stream && response.body) {
         return response.body;
       }

       const completion = await response.json();
       return completion;
} catch (error: any) {
       clearTimeout(timeoutId);
       if (error instanceof AppError) throw error;
       if ((error as Error).name === 'AbortError') {
         throw new AppError(504, 'AI provider request timed out after 120s');
       }
       logger.error('AI chat completion failed', { error: error.message });
       throw new AppError(502, `AI provider request failed: ${error.message}`);
     }
   }

  async createEmbeddings(providerSlug: string, modelSlug: string, input: string | string[]): Promise<any> {
    const provider = await prisma.aiProvider.findUnique({ where: { slug: providerSlug } });
    if (!provider) throw new NotFoundError('AI provider not found');
    if (!provider.isEnabled) throw new AppError(400, 'AI provider is disabled');

    const model = await prisma.aiModel.findUnique({ where: { slug: modelSlug } });
    const modelName = model?.name || modelSlug;

    const baseUrl = this.defaultBaseUrl(provider);
    const apiKey = await this.getDecryptedApiKey(provider.id);
    const providerFormat = this.providerFormat(provider);

    if (providerFormat === 'gemini') {
      return this.geminiEmbeddings(baseUrl, apiKey, modelName, input);
    }

    if (providerFormat === 'anthropic') {
      throw new AppError(400, 'Anthropic does not currently expose a compatible embeddings endpoint');
    }

    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey ? `Bearer ${apiKey}` : '',
        },
        body: JSON.stringify({ model: modelName, input }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(response.status, `AI embeddings provider error: ${errorText}`);
      }

      return await response.json() as any;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      logger.error('AI embeddings request failed', { error: error.message });
      throw new AppError(502, `AI embeddings request failed: ${error.message}`);
    }
  }

   // ── Streaming Chat Completion with XML Tag Extraction ──

   async chatCompletionStream(
     providerSlug: string,
     modelSlug: string,
     messages: ChatMessage[],
     callbacks: StreamCallbacks,
     options?: { temperature?: number; max_tokens?: number; tools?: any[] }
   ): Promise<void> {
     const provider = await prisma.aiProvider.findUnique({ where: { slug: providerSlug } });
     if (!provider) throw new NotFoundError('AI provider not found');
     if (!provider.isEnabled) throw new AppError(400, 'AI provider is disabled');

     const model = await prisma.aiModel.findUnique({ where: { slug: modelSlug } });
     if (!model) throw new NotFoundError('AI model not found');
     if (!model.isActive) throw new AppError(400, 'AI model is not active');

     const baseUrl = this.defaultBaseUrl(provider);
     const apiKey = await this.getDecryptedApiKey(provider.id);
     const providerFormat = this.providerFormat(provider);

     if (providerFormat !== 'openai') {
       try {
         const completion: any = await this.chatCompletion(providerSlug, modelSlug, messages, options);
         const content = completion?.choices?.[0]?.message?.content || '';
         if (content && callbacks.onContent) callbacks.onContent(content);
         if (callbacks.onDone) {
           callbacks.onDone({
             content,
             thinking: '',
             model: completion?.model || modelSlug,
             tokens: completion?.usage?.total_tokens || 0,
           });
         }
       } catch (error) {
         if (callbacks.onError) callbacks.onError((error as Error).message);
       }
       return;
     }

const modelName = model.name || modelSlug;

      const body: any = {
        model: modelName,
        messages: messages.map(m => {
          const msg: any = { role: m.role };
          if ((m as any).tool_calls) msg.tool_calls = (m as any).tool_calls;
          if (m.role === 'tool') {
            msg.content = m.content;
            msg.tool_call_id = (m as any).tool_call_id;
          } else {
            msg.content = m.content;
          }
         return msg;
       }),
       temperature: options?.temperature ?? 0.7,
       max_tokens: options?.max_tokens ?? Math.min(model.contextLength, 4096),
       stream: true,
     };

    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools;
      body.tool_choice = 'auto';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey ? `Bearer ${apiKey}` : '',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(response.status, `AI provider error: ${errorText}`);
      }

      if (!response.body) throw new AppError(502, 'No response body from AI provider');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      // XML tag parsing state machine
      let buffer = '';
      let fullContent = '';
      let fullThinking = '';
      let currentTag: 'title' | 'thinking' | 'answer' | null = null;
      let tagContentBuffer = '';
      let titleExtracted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            // Extract tool calls from stream
            if (parsed.choices?.[0]?.delta?.tool_calls) {
              const toolCall = parsed.choices[0].delta.tool_calls[0];
              if (callbacks.onToolCall) callbacks.onToolCall(toolCall);
              continue;
            }

            const delta = parsed.choices?.[0]?.delta;
            if (!delta) continue;

            const token = delta.content || '';
            if (!token) continue;

            // Process token through XML state machine
            for (let i = 0; i < token.length; i++) {
              const char = token[i];
              const remaining = token.slice(i);

              if (currentTag === null) {
                // Not inside any tag — look for opening tags
                if (char === '<') {
                  if (remaining.startsWith('<title>') && !titleExtracted) {
                    currentTag = 'title';
                    tagContentBuffer = '';
                    i += '<title>'.length - 1;
                    continue;
                  } else if (remaining.startsWith('<thinking>')) {
                    currentTag = 'thinking';
                    tagContentBuffer = '';
                    i += '<thinking>'.length - 1;
                    continue;
                  } else if (remaining.startsWith('<answer>')) {
                    currentTag = 'answer';
                    tagContentBuffer = '';
                    i += '<answer>'.length - 1;
                    continue;
                  } else {
                    // Literal '<' character — treat as content
                    fullContent += char;
                    if (callbacks.onContent) callbacks.onContent(char);
                  }
                } else {
                  // Regular content outside tags
                  fullContent += char;
                  if (callbacks.onContent) callbacks.onContent(char);
                }
              } else {
                // Inside a tag — look for closing tag
                let closingTag = '';
                if (currentTag === 'title') closingTag = '</title>';
                else if (currentTag === 'thinking') closingTag = '</thinking>';
                else if (currentTag === 'answer') closingTag = '</answer>';

                if (remaining.startsWith(closingTag)) {
                  // Tag closed — process accumulated content
                  const tagContent = tagContentBuffer;

                  if (currentTag === 'title' && !titleExtracted) {
                    titleExtracted = true;
                    const extractedTitle = tagContent.trim();
                    // Title is not streamed to content callback
                    // It will be handled by the AIChatService for DB update
                  } else if (currentTag === 'thinking') {
                    fullThinking = tagContent;
                    // Send complete thinking to callback
                    if (callbacks.onThinking) callbacks.onThinking(tagContent);
                  } else if (currentTag === 'answer') {
                    // Answer tag closed — nothing special needed
                  }

                  currentTag = null;
                  tagContentBuffer = '';
                  i += closingTag.length - 1;
                } else {
                  // Accumulate content inside tag
                  tagContentBuffer += char;

                  // Stream thinking incrementally
                  if (currentTag === 'thinking') {
                    fullThinking = tagContentBuffer;
                    if (callbacks.onThinking) callbacks.onThinking(fullThinking);
                  }
                  // Stream answer content immediately
                  else if (currentTag === 'answer') {
                    fullContent += char;
                    if (callbacks.onContent) callbacks.onContent(char);
                  }
                  // Title is buffered, not streamed
                }
              }
            }

            // Check finish reason
            const finishReason = parsed.choices?.[0]?.finish_reason;
            if (finishReason && finishReason !== 'null' && finishReason !== null) {
              if (callbacks.onDone) {
                callbacks.onDone({
                  content: fullContent.trim(),
                  thinking: fullThinking.trim(),
                  model: parsed.model || modelSlug,
                  tokens: parsed.usage?.total_tokens || parsed.usage?.completion_tokens || 0,
                });
              }
              return;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      // Stream ended without explicit done signal
      if (callbacks.onDone) {
        callbacks.onDone({
          content: fullContent.trim(),
          thinking: fullThinking.trim(),
          model: modelSlug,
          tokens: 0,
        });
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof AppError) throw error;
      if ((error as Error).name === 'AbortError') {
        logger.error('AI streaming timed out after 120s');
        if (callbacks.onError) callbacks.onError('Request timed out after 120 seconds');
        return;
      }
      logger.error('AI streaming failed', { error: (error as Error).message });
      if (callbacks.onError) callbacks.onError((error as Error).message);
    }
  }

  // ── Helpers ──

  private providerFormat(provider: any): 'openai' | 'anthropic' | 'gemini' {
    const value = `${provider.provider || ''} ${provider.slug || ''} ${provider.name || ''} ${provider.baseUrl || ''}`.toLowerCase();
    if (value.includes('anthropic') || value.includes('claude')) return 'anthropic';
    if (value.includes('gemini') || value.includes('google')) return 'gemini';
    return 'openai';
  }

  private normalizeBaseUrl(rawUrl: string | null | undefined): string {
    if (!rawUrl) return '';
    // Decode HTML entities (e.g. &#x2F; -> /)
    const decoded = rawUrl
      .trim()
      .replace(/&#x2F;/g, '/')
      .replace(/&#47;/g, '/')
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/&#39;/g, "'");
    // Only strip trailing slashes — never rewrite the URL path
    return decoded.replace(/\/+$/g, '');
  }

  private defaultBaseUrl(provider: any): string {
    if (provider.baseUrl) return this.normalizeBaseUrl(provider.baseUrl);
    const format = this.providerFormat(provider);
    if (format === 'anthropic') return 'https://api.anthropic.com/v1';
    if (format === 'gemini') return 'https://generativelanguage.googleapis.com/v1beta';
    return 'https://api.openai.com/v1';
  }

  private providerAuthHeaders(provider: any, apiKey: string | null): Record<string, string> {
    const format = this.providerFormat(provider);
    if (format === 'anthropic') {
      return {
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
        'anthropic-version': '2023-06-01',
      };
    }
    if (format === 'gemini') return {};
    return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  }

  private modelListUrl(provider: any, baseUrl: string, apiKey: string | null): string {
    if (this.providerFormat(provider) === 'gemini') {
      const key = apiKey ? `?key=${encodeURIComponent(apiKey)}` : '';
      return `${baseUrl.replace(/\/+$/, '')}/models${key}`;
    }
    return `${baseUrl.replace(/\/+$/, '')}/models`;
  }

  private splitSystemMessages(messages: ChatMessage[]) {
    const system = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n');
    const conversation = messages.filter((message) => message.role !== 'system' && message.role !== 'tool');
    return { system, conversation };
  }

  private normalizeCompletion(model: string, content: string, usage?: any, finishReason?: string) {
    return {
      id: `chatcmpl_${crypto.randomUUID()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: finishReason || 'stop',
      }],
      usage: {
        prompt_tokens: usage?.input_tokens || usage?.promptTokenCount || usage?.prompt_tokens || 0,
        completion_tokens: usage?.output_tokens || usage?.candidatesTokenCount || usage?.completion_tokens || 0,
        total_tokens: usage?.total_tokens || usage?.totalTokenCount || 0,
      },
    };
  }

  private async anthropicChatCompletion(
    baseUrl: string,
    apiKey: string | null,
    modelSlug: string,
    messages: ChatMessage[],
    options?: { temperature?: number; max_tokens?: number },
  ) {
    if (!apiKey) throw new AppError(401, 'Anthropic API key is not configured');
    const { system, conversation } = this.splitSystemMessages(messages);
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelSlug,
        system: system || undefined,
        messages: conversation.map((message) => ({
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: message.content,
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.max_tokens ?? 4096,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AppError(response.status, `Anthropic provider error: ${errorText}`);
    }

    const data: any = await response.json();
    const content = (data.content || [])
      .map((part: any) => part.type === 'text' ? part.text : '')
      .join('');
    return this.normalizeCompletion(data.model || modelSlug, content, data.usage, data.stop_reason);
  }

  private async geminiChatCompletion(
    baseUrl: string,
    apiKey: string | null,
    modelSlug: string,
    messages: ChatMessage[],
    options?: { temperature?: number; max_tokens?: number },
  ) {
    if (!apiKey) throw new AppError(401, 'Gemini API key is not configured');
    const { system, conversation } = this.splitSystemMessages(messages);
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/models/${encodeURIComponent(modelSlug)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents: conversation.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.max_tokens ?? 4096,
        },
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AppError(response.status, `Gemini provider error: ${errorText}`);
    }

    const data: any = await response.json();
    const content = (data.candidates?.[0]?.content?.parts || [])
      .map((part: any) => part.text || '')
      .join('');
    return this.normalizeCompletion(modelSlug, content, data.usageMetadata, data.candidates?.[0]?.finishReason);
  }

  private async geminiEmbeddings(baseUrl: string, apiKey: string | null, modelSlug: string, input: string | string[]) {
    if (!apiKey) throw new AppError(401, 'Gemini API key is not configured');
    const values = Array.isArray(input) ? input : [input];
    const embeddings = [];
    for (const value of values) {
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/models/${encodeURIComponent(modelSlug)}:embedContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { parts: [{ text: value }] } }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(response.status, `Gemini embeddings provider error: ${errorText}`);
      }
      const data: any = await response.json();
      embeddings.push(data.embedding?.values || []);
    }
    return {
      object: 'list',
      data: embeddings.map((embedding, index) => ({ object: 'embedding', index, embedding })),
      model: modelSlug,
      usage: { total_tokens: 0 },
    };
  }

  private sanitizeProvider(provider: any) {
    return {
      id: provider.id,
      name: provider.name,
      slug: provider.slug,
      provider: provider.provider,
      baseUrl: provider.baseUrl,
      models: JSON.parse(provider.models || '[]'),
      config: provider.config ? JSON.parse(provider.config) : null,
      isEnabled: provider.isEnabled,
      hasKey: !!provider.apiKey,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
      // Intentionally NOT exposing apiKey
    };
  }

  private sanitizeModel(model: any) {
    return {
      id: model.id,
      name: model.name,
      slug: model.slug,
      providerId: model.providerId,
      capabilities: JSON.parse(model.capabilities || '[]'),
      contextLength: model.contextLength,
      pricing: model.pricing ? JSON.parse(model.pricing) : null,
      isActive: model.isActive,
      createdAt: model.createdAt,
    };
  }
}
