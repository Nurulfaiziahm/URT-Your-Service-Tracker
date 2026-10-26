import { z } from 'zod';

/**
 * Common Validation Schemas using Zod
 * Shared across multiple modules
 */

// Query string number parser

export const numericString = z.string().regex(/^\d+$/).transform(Number);
