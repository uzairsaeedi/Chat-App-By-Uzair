// utils/errorHandler.js
// Centralized error handling utility

/**
 * Logs errors to console (can be extended to send to analytics/monitoring service)
 */
export const logError = (error, context = '') => {
  console.error(`[Error${context ? ` - ${context}` : ''}]:`, error);
  
  // TODO: Add analytics/monitoring service like Sentry
  // Sentry.captureException(error, { tags: { context } });
};

/**
 * Formats Firebase Auth errors into user-friendly messages
 */
export const formatAuthError = (error) => {
  const errorCode = error.code || error.message;
  
  const errorMessages = {
    'auth/invalid-email': 'Invalid email address format',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/invalid-credential': 'Invalid email or password',
    'auth/email-already-in-use': 'This email is already registered',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/operation-not-allowed': 'Operation not allowed',
    'auth/too-many-requests': 'Too many attempts. Please try again later',
    'auth/network-request-failed': 'Network error. Please check your connection',
    'auth/requires-recent-login': 'Please sign in again to continue',
  };

  return errorMessages[errorCode] || error.message || 'An unexpected error occurred';
};

/**
 * Formats Firestore errors into user-friendly messages
 */
export const formatFirestoreError = (error) => {
  const errorCode = error.code || error.message;
  
  const errorMessages = {
    'permission-denied': 'You do not have permission to perform this action',
    'not-found': 'The requested data was not found',
    'already-exists': 'This data already exists',
    'resource-exhausted': 'Too many requests. Please try again later',
    'failed-precondition': 'Operation cannot be performed in current state',
    'aborted': 'Operation was aborted. Please try again',
    'unavailable': 'Service temporarily unavailable. Please try again',
    'network-request-failed': 'Network error. Please check your connection',
  };

  return errorMessages[errorCode] || error.message || 'An unexpected error occurred';
};

/**
 * Formats Storage errors into user-friendly messages
 */
export const formatStorageError = (error) => {
  const errorCode = error.code || error.message;
  
  const errorMessages = {
    'storage/unauthorized': 'You do not have permission to access this file',
    'storage/canceled': 'Upload was cancelled',
    'storage/unknown': 'Unknown error occurred',
    'storage/object-not-found': 'File not found',
    'storage/bucket-not-found': 'Storage bucket not found',
    'storage/quota-exceeded': 'Storage quota exceeded',
    'storage/unauthenticated': 'Please sign in to upload files',
    'storage/retry-limit-exceeded': 'Upload failed. Please try again',
  };

  return errorMessages[errorCode] || error.message || 'An error occurred while uploading';
};

/**
 * Validates email format
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    return { valid: false, message: 'Email is required' };
  }
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Invalid email format' };
  }
  return { valid: true };
};

/**
 * Validates password strength
 */
export const validatePassword = (password) => {
  if (!password) {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  return { valid: true };
};

/**
 * Validates username
 */
export const validateUsername = (username) => {
  if (!username) {
    return { valid: false, message: 'Username is required' };
  }
  if (username.length < 3) {
    return { valid: false, message: 'Username must be at least 3 characters' };
  }
  if (username.length > 20) {
    return { valid: false, message: 'Username must be less than 20 characters' };
  }
  return { valid: true };
};

/**
 * Safe async wrapper that catches errors
 */
export const safeAsync = async (fn, context = '') => {
  try {
    return await fn();
  } catch (error) {
    logError(error, context);
    throw error;
  }
};
