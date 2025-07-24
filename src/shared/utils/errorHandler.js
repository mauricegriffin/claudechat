/**
 * Centralized error handling utilities
 * Provides consistent error formatting and logging across the application
 */

export class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500, details = null) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.timestamp = new Date().toISOString()
  }
}

/**
 * Maps Supabase errors to user-friendly messages
 */
export const supabaseErrorMap = {
  'Invalid login credentials': 'The email or password you entered is incorrect',
  'User already registered': 'An account with this email already exists',
  'Email not confirmed': 'Please check your email and confirm your account',
  'Password should be at least 6 characters': 'Password must be at least 6 characters long',
  'invalid_grant': 'Your session has expired. Please log in again',
  'PGRST116': 'No data found', // PostgREST error for no rows returned
}

/**
 * Handles errors from Supabase operations
 * @param {Error} error - The error object from Supabase
 * @returns {AppError} - Formatted error object
 */
export function handleSupabaseError(error) {
  const userMessage = supabaseErrorMap[error.message] || error.message
  
  // Log detailed error for debugging
  console.error('Supabase Error:', {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    stack: error.stack
  })
  
  return new AppError(
    userMessage,
    error.code || 'SUPABASE_ERROR',
    error.status || 500,
    error.details
  )
}

/**
 * Safely executes an async operation with error handling
 * @param {Function} operation - Async function to execute
 * @param {string} errorMessage - Custom error message if operation fails
 * @returns {Promise} - Result of the operation or throws AppError
 */
export async function safeAsync(operation) {
  try {
    return await operation()
  } catch (error) {
    if (error.message?.includes('Failed to fetch')) {
      throw new AppError(
        'Network error. Please check your connection and try again.',
        'NETWORK_ERROR',
        0
      )
    }
    
    if (error.message?.includes('JWT')) {
      throw new AppError(
        'Your session has expired. Please log in again.',
        'SESSION_EXPIRED',
        401
      )
    }
    
    throw handleSupabaseError(error)
  }
}

/**
 * Retry logic for failed operations
 * @param {Function} operation - Operation to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} delay - Delay between retries in milliseconds
 */
export async function retryOperation(operation, maxRetries = 3, delay = 1000) {
  let lastError
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      console.warn(`Operation failed (attempt ${i + 1}/${maxRetries}):`, error.message)
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
      }
    }
  }
  
  throw lastError
}