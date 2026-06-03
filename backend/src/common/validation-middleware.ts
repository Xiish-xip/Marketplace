import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { logger } from './logger';

/**
 * Validates request body against a Zod schema
 * @param schema - The Zod schema to validate against
 * @returns Express middleware function
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error: any) {
      logger.warn('Request validation failed', {
        path: req.path,
        method: req.method,
        errors: error.errors?.map((e: any) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
      res.status(400).json({
        success: false,
        message: 'Invalid request body',
        errors: error.errors?.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
  };
}

/**
 * Validates request query parameters against a Zod schema
 * @param schema - The Zod schema to validate against
 * @returns Express middleware function
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated as any;
      next();
    } catch (error: any) {
      logger.warn('Query validation failed', {
        path: req.path,
        method: req.method,
        errors: error.errors?.map((e: any) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
      res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: error.errors?.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
  };
}

/**
 * Validates request parameters against a Zod schema
 * @param schema - The Zod schema to validate against
 * @returns Express middleware function
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated as any;
      next();
    } catch (error: any) {
      logger.warn('Params validation failed', {
        path: req.path,
        method: req.method,
        errors: error.errors?.map((e: any) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
      res.status(400).json({
        success: false,
        message: 'Invalid path parameters',
        errors: error.errors?.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
  };
}
