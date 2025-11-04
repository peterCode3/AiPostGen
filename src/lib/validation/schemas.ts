/**
 * Validation schemas using Zod
 * Ensures type-safe input validation across all API endpoints
 */

import { z } from 'zod';

// Common schemas
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId');

export const languageSchema = z.enum(['en', 'ar'], {
  errorMap: () => ({ message: 'Language must be "en" or "ar"' })
});

export const statusSchema = z.enum(['draft', 'review', 'scheduled', 'published', 'rejected']);

// Generate API schemas
export const generateRequestSchema = z.object({
  keywordIds: z.array(objectIdSchema)
    .min(1, 'At least one keyword ID required')
    .max(10, 'Maximum 10 keywords per request'),
  sourceIds: z.array(objectIdSchema).optional(),
  language: languageSchema.optional().default('en'),
  customInstructions: z.string().max(1000).optional(),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

// Article update schemas
export const articleUpdateSchema = z.object({
  title: z.string().min(10).max(200).optional(),
  metaTitle: z.string().min(10).max(60).optional(),
  metaDescription: z.string().min(50).max(160).optional(),
  keywords: z.array(z.string()).optional(),
  content: z.object({
    markdown: z.string().min(100),
    html: z.string().optional(),
  }).optional(),
  prompt: z.string().optional(),
  regenerate: z.boolean().optional(),
  language: languageSchema.optional(),
});

export type ArticleUpdate = z.infer<typeof articleUpdateSchema>;

// Schedule article schema
export const scheduleArticleSchema = z.object({
  scheduledAt: z.string().datetime().or(z.date()),
});

export type ScheduleArticle = z.infer<typeof scheduleArticleSchema>;

// Keyword import schema
export const keywordImportSchema = z.object({
  keywords: z.array(z.object({
    term: z.string().min(2).max(200),
    locale: languageSchema.optional().default('en'),
    intent: z.enum(['informational', 'commercial', 'transactional']).optional(),
  })).min(1).max(100),
});

export type KeywordImport = z.infer<typeof keywordImportSchema>;

// Source scrape schema
export const sourceScrapeSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(20, 'Maximum 20 URLs per request'),
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
});

export type SourceScrape = z.infer<typeof sourceScrapeSchema>;

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type Login = z.infer<typeof loginSchema>;

// Query params schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type Pagination = z.infer<typeof paginationSchema>;

export const articleFilterSchema = paginationSchema.extend({
  status: statusSchema.optional(),
  language: languageSchema.optional(),
  keyword: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export type ArticleFilter = z.infer<typeof articleFilterSchema>;

/**
 * Validation helper function
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error };
}

/**
 * Format Zod errors for API responses
 */
export function formatZodErrors(error: z.ZodError): Array<{ field: string; message: string }> {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

