/**
 * Auth Service - Handles auth reliability, timeouts, retries, and friendly error messages
 */

const AUTH_TIMEOUT_MS = 8000;
const MAX_RETRIES = 1;

export interface AuthServiceStatus {
  isHealthy: boolean;
  lastChecked: Date | null;
  error?: string;
}

// Global auth service status
let serviceStatus: AuthServiceStatus = {
  isHealthy: true, // Assume healthy until proven otherwise
  lastChecked: null,
};

/**
 * Cleanup all auth-related storage
 */
export const cleanupAuthState = () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

/**
 * Get user-friendly error message from auth errors
 */
export const getFriendlyErrorMessage = (error: unknown): string => {
  if (!error) return 'An unexpected error occurred';
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Network errors
  if (
    errorMessage.includes('fetch') ||
    errorMessage.includes('network') ||
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('NetworkError') ||
    errorMessage.includes('ECONNREFUSED')
  ) {
    return 'Authentication service temporarily unavailable. Please check your internet connection and try again.';
  }
  
  // Specific auth errors with friendly messages
  if (errorMessage.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  
  if (errorMessage.includes('Email not confirmed')) {
    return 'Please verify your email address before signing in.';
  }
  
  if (errorMessage.includes('already registered')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  
  if (errorMessage.includes('rate limit') || errorMessage.includes('Too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  
  if (errorMessage.includes('weak password') || errorMessage.includes('Password')) {
    return 'Password must be at least 6 characters long.';
  }
  
  if (errorMessage.includes('Invalid email')) {
    return 'Please enter a valid email address.';
  }
  
  if (errorMessage.includes('User not found')) {
    return 'No account found with this email address.';
  }
  
  if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
    return 'Request timed out. Please try again.';
  }
  
  // Return original message if no match, but sanitize it
  return errorMessage.length > 100 
    ? 'An error occurred during authentication. Please try again.'
    : errorMessage;
};

/**
 * Wrap a promise with timeout
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = AUTH_TIMEOUT_MS
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Request timed out'));
    }, timeoutMs);
    
    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

/**
 * Execute auth request with retry logic
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> => {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(operation());
    } catch (error) {
      lastError = error;
      
      // Don't retry for auth-specific errors (credentials, etc.)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('Invalid login credentials') ||
        errorMessage.includes('Email not confirmed') ||
        errorMessage.includes('already registered') ||
        errorMessage.includes('weak password')
      ) {
        throw error;
      }
      
      // Only retry on network-type errors
      if (attempt < retries) {
        // Small delay before retry
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }
  
  throw lastError;
};

/**
 * Check if auth service is likely available
 * Note: This is a lightweight check based on recent activity
 */
export const checkAuthServiceHealth = (): AuthServiceStatus => {
  return serviceStatus;
};

/**
 * Update service status based on request result
 */
export const updateServiceStatus = (isHealthy: boolean, error?: string) => {
  serviceStatus = {
    isHealthy,
    lastChecked: new Date(),
    error: isHealthy ? undefined : error,
  };
};

/**
 * Demo user credentials and mock session
 */
export const DEMO_USER = {
  email: 'demo@studyhub.com',
  id: 'demo-user-offline-id-12345',
  name: 'Demo User',
  role: 'student',
};

/**
 * Create a mock demo session for offline use
 * This bypasses the backend completely
 */
export const createDemoSession = () => {
  // Create a mock session that mimics Supabase session structure
  const mockSession = {
    access_token: 'demo-access-token-offline',
    refresh_token: 'demo-refresh-token-offline',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: DEMO_USER.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: DEMO_USER.email,
      email_confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_metadata: {
        full_name: DEMO_USER.name,
        first_name: 'Demo',
        last_name: 'User',
        role: DEMO_USER.role,
        is_demo: true,
      },
      app_metadata: {
        provider: 'demo',
        is_demo: true,
      },
    },
  };
  
  // Store in localStorage to persist across reloads
  localStorage.setItem('demo_session', JSON.stringify(mockSession));
  localStorage.setItem('demo_user_active', 'true');
  
  return mockSession;
};

/**
 * Check if current session is a demo session
 */
export const isDemoSession = (): boolean => {
  return localStorage.getItem('demo_user_active') === 'true';
};

/**
 * Get the stored demo session
 */
export const getDemoSession = () => {
  const sessionStr = localStorage.getItem('demo_session');
  return sessionStr ? JSON.parse(sessionStr) : null;
};

/**
 * Clear demo session
 */
export const clearDemoSession = () => {
  localStorage.removeItem('demo_session');
  localStorage.removeItem('demo_user_active');
};
