/**
 * Shared types for Server Actions
 * CTO Dashboard v2.0 - Next.js 14
 */

// Standard action response type
export type ActionResponse<T = unknown> = {
  success: true
  data: T
} | {
  success: false
  error: string
  code?: string
}

// Helper to create success response
export function success<T>(data: T): ActionResponse<T> {
  return { success: true, data }
}

// Helper to create error response
export function error(message: string, code?: string): ActionResponse<never> {
  return { success: false, error: message, code }
}

// Audit log context
export type AuditContext = {
  userId?: string
  ipAddress?: string
  userAgent?: string
}
