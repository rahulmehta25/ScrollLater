import { z } from 'zod'

// URL validation regex
const URL_REGEX = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/

// Entry validation schemas
export const entryFormSchema = z.object({
  content: z.string()
    .min(1, 'Content is required')
    .max(5000, 'Content must be less than 5000 characters'),
  url: z.string()
    .optional()
    .refine((val) => !val || URL_REGEX.test(val), {
      message: 'Please enter a valid URL',
    }),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  priority: z.number().min(1).max(5).default(3),
})

export const editEntrySchema = entryFormSchema.extend({
  title: z.string()
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  user_notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
})

// Profile validation schemas
export const profileSchema = z.object({
  display_name: z.string()
    .max(100, 'Display name must be less than 100 characters')
    .optional(),
  timezone: z.string(),
  default_block_duration: z.number()
    .min(15, 'Duration must be at least 15 minutes')
    .max(240, 'Duration must be less than 4 hours'),
  auto_schedule_enabled: z.boolean(),
})

// Settings validation schemas
export const shortcutTokenSchema = z.string()
  .length(64, 'Token must be 64 characters')
  .regex(/^[a-f0-9]+$/, 'Token must be hexadecimal')

// Search validation
export const searchQuerySchema = z.string()
  .max(100, 'Search query is too long')
  .transform((val) => val.trim())

// Tag validation
export const tagSchema = z.string()
  .min(1, 'Tag cannot be empty')
  .max(30, 'Tag must be less than 30 characters')
  .regex(/^[a-zA-Z0-9-_]+$/, 'Tag can only contain letters, numbers, hyphens, and underscores')

// Helper function to validate form data
export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  try {
    const validData = schema.parse(data)
    return { success: true, data: validData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {}
      error.issues.forEach((issue) => {
        if (issue.path.length > 0) {
          errors[issue.path[0].toString()] = issue.message
        }
      })
      return { success: false, errors }
    }
    return { success: false, errors: { _form: 'Invalid form data' } }
  }
}

// Type exports
export type EntryFormData = z.infer<typeof entryFormSchema>
export type EditEntryData = z.infer<typeof editEntrySchema>
export type ProfileData = z.infer<typeof profileSchema>
export type SearchQuery = z.infer<typeof searchQuerySchema>