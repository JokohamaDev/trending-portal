import { z, ZodSchema, ZodError } from 'zod';
import { TrendingItemSchema, CategoryDataSchema, type TrendingItem, type CategoryData } from './schemas';

interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export function validateData<T>(
  data: unknown,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const validated = schema.parse(data);
    return {
      success: true,
      data: validated,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.issues.map((issue: z.ZodIssue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
        return `${path}: ${issue.message}`;
      });
      
      console.error('[Validation Error]', errors.join('\n'));
      
      return {
        success: false,
        errors,
      };
    }
    
    console.error('[Validation Error] Unknown error:', error);
    return {
      success: false,
      errors: ['Unknown validation error'],
    };
  }
}

export function validateTrendingItem(item: unknown): ValidationResult<TrendingItem> {
  return validateData(item, TrendingItemSchema);
}

export function validateTrendingItems(items: unknown[]): ValidationResult<TrendingItem[]> {
  const schema = z.array(TrendingItemSchema);
  return validateData(items, schema);
}

export function validateCategoryData(data: unknown): ValidationResult<CategoryData> {
  return validateData(data, CategoryDataSchema);
}

export function sanitizeTrendingItem(item: unknown): TrendingItem | null {
  const result = validateTrendingItem(item);
  return result.success ? result.data! : null;
}

export function sanitizeTrendingItems(items: unknown[]): TrendingItem[] {
  if (!Array.isArray(items)) {
    console.error('[Sanitize] Expected array, got:', typeof items);
    return [];
  }
  
  const valid: TrendingItem[] = [];
  const invalid: unknown[] = [];
  
  for (const item of items) {
    const sanitized = sanitizeTrendingItem(item);
    if (sanitized) {
      valid.push(sanitized);
    } else {
      invalid.push(item);
    }
  }
  
  if (invalid.length > 0) {
    console.warn(`[Sanitize] Filtered out ${invalid.length} invalid items`);
  }
  
  return valid;
}
