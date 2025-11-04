/**
 * Centralized error handling for API routes
 * Provides consistent error responses and logging
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { formatZodErrors } from '../validation/schemas';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: any) {
    super(
      `External service error: ${service}`,
      502,
      'EXTERNAL_SERVICE_ERROR',
      originalError?.message
    );
    this.name = 'ExternalServiceError';
  }
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: any) {
  // Development vs production error details
  const isDev = process.env.NODE_ENV === 'development';

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: formatZodErrors(error),
      ...(isDev && { stack: error.stack }),
    };
  }

  // Handle custom AppError instances
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      ...(error.details && { details: error.details }),
      ...(isDev && { stack: error.stack }),
    };
  }

  // Handle Mongoose validation errors
  if (error.name === 'ValidationError' && error.errors) {
    return {
      error: 'Database validation failed',
      code: 'DB_VALIDATION_ERROR',
      details: Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message,
      })),
      ...(isDev && { stack: error.stack }),
    };
  }

  // Handle Mongoose duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];
    return {
      error: `Duplicate value for field: ${field}`,
      code: 'DUPLICATE_KEY',
      field,
      ...(isDev && { stack: error.stack }),
    };
  }

  // Handle MongoDB connection errors
  if (error.name === 'MongoNetworkError' || error.name === 'MongooseServerSelectionError') {
    return {
      error: 'Database connection failed',
      code: 'DB_CONNECTION_ERROR',
      ...(isDev && { details: error.message, stack: error.stack }),
    };
  }

  // Handle OpenAI/LLM errors
  if (error.status && error.type) {
    return {
      error: 'LLM API error',
      code: 'LLM_API_ERROR',
      details: error.message,
      status: error.status,
      ...(isDev && { stack: error.stack }),
    };
  }

  // Generic error fallback
  return {
    error: isDev ? error.message : 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(isDev && { 
      details: error.message,
      stack: error.stack,
      name: error.name 
    }),
  };
}

/**
 * Get HTTP status code from error
 */
export function getStatusCode(error: any): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  if (error instanceof ZodError) {
    return 400;
  }

  if (error.name === 'ValidationError') {
    return 400;
  }

  if (error.code === 11000) {
    return 409; // Conflict
  }

  if (error.name === 'MongoNetworkError' || error.name === 'MongooseServerSelectionError') {
    return 503; // Service Unavailable
  }

  if (error.status) {
    return error.status;
  }

  return 500;
}

/**
 * Main error handler middleware
 */
export function handleError(error: any): NextResponse {
  const statusCode = getStatusCode(error);
  const errorResponse = formatErrorResponse(error);

  // Log error (in production, send to error tracking service like Sentry)
  console.error('[API Error]', {
    statusCode,
    error: errorResponse,
    timestamp: new Date().toISOString(),
  });

  // TODO: Send to error tracking service
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error);
  // }

  return NextResponse.json(errorResponse, { status: statusCode });
}

/**
 * Async error wrapper for API routes
 * Usage: export const POST = asyncHandler(async (req) => { ... })
 */
export function asyncHandler(
  handler: (req: Request, context?: any) => Promise<Response | NextResponse>
) {
  return async (req: Request, context?: any): Promise<Response | NextResponse> => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Assert condition or throw error
 */
export function assert(
  condition: any,
  message: string,
  ErrorClass: typeof AppError = AppError
): asserts condition {
  if (!condition) {
    throw new ErrorClass(message);
  }
}

/**
 * Safe JSON parse with fallback
 */
export async function safeJsonParse<T = any>(req: Request): Promise<T | null> {
  try {
    return await req.json();
  } catch {
    throw new ValidationError('Invalid JSON in request body');
  }
}

/**
 * Validate and parse request body
 */
export async function validateRequest<T>(
  req: Request,
  schema: any
): Promise<T> {
  const body = await safeJsonParse(req);
  const result = schema.safeParse(body);

  if (!result.success) {
    throw result.error; // Will be caught and formatted by handleError
  }

  return result.data;
}

