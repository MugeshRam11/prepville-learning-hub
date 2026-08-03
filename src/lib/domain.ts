/**
 * Domain Detection & Multi-Domain Navigation Helper
 * Handles www.theprepville.com, student.theprepville.com, and admin.theprepville.com
 * Supports local dev (localhost, student.localhost, admin.localhost, or ?domain=... simulation)
 */

export type AppDomain = 'www' | 'student' | 'admin';

export const PROD_DOMAINS = {
  www: 'www.theprepville.com',
  student: 'student.theprepville.com',
  admin: 'admin.theprepville.com',
};

/**
 * Determine the current active domain
 */
export const getActiveDomain = (): AppDomain => {
  if (typeof window === 'undefined') return 'www';

  const hostname = window.location.hostname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);

  // 1. Check for manual query simulation parameter (?domain=student / ?domain=admin / ?domain=www)
  const simulatedDomain = searchParams.get('domain')?.toLowerCase();
  if (simulatedDomain === 'student' || simulatedDomain === 'admin' || simulatedDomain === 'www') {
    return simulatedDomain as AppDomain;
  }

  // 2. Subdomain check for production and local subdomains
  if (hostname.includes('student.theprepville.com') || hostname.startsWith('student.')) {
    return 'student';
  }

  if (hostname.includes('admin.theprepville.com') || hostname.startsWith('admin.')) {
    return 'admin';
  }

  if (hostname.includes('www.theprepville.com') || hostname === 'theprepville.com' || hostname.startsWith('www.')) {
    return 'www';
  }

  // 3. Fallback for localhost development mode based on route paths
  const pathname = window.location.pathname.toLowerCase();

  // Admin routes on localhost
  if (pathname.startsWith('/admin')) {
    return 'admin';
  }

  // Student app routes on localhost (/dashboard, /login, /register, /forgot-password, /practice, /mock-exams, /subjects, /analytics, etc.)
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/practice') ||
    pathname.startsWith('/mock-exams') ||
    pathname.startsWith('/subjects') ||
    pathname.startsWith('/subject-learning') ||
    pathname.startsWith('/videos') ||
    pathname.startsWith('/study-materials') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/study-groups') ||
    pathname.startsWith('/graphing-tool') ||
    pathname.startsWith('/formula-helper') ||
    pathname.startsWith('/timed-challenge') ||
    pathname.startsWith('/leaderboard') ||
    pathname.startsWith('/level-details') ||
    pathname.startsWith('/subscription') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/quiz') ||
    pathname.startsWith('/quick-practice') ||
    pathname.startsWith('/assignments')
  ) {
    return 'student';
  }

  return 'www';
};

/**
 * Build target URL for a domain and path
 */
export const getDomainUrl = (targetDomain: AppDomain, path: string = '/'): string => {
  if (typeof window === 'undefined') return path;

  const currentDomain = getActiveDomain();
  const isLocalhost = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // On Localhost development mode:
  if (isLocalhost) {
    const port = window.location.port ? `:${window.location.port}` : '';
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    if (targetDomain === 'www') {
      return `${protocol}//${hostname}${port}${cleanPath}?domain=www`;
    }
    return `${protocol}//${hostname}${port}${cleanPath}?domain=${targetDomain}`;
  }

  // If already on the target domain in production, return relative path
  if (currentDomain === targetDomain) {
    return cleanPath;
  }

  // Production domain redirection
  const protocol = window.location.protocol;
  const host = PROD_DOMAINS[targetDomain] || PROD_DOMAINS.www;
  
  return `${protocol}//${host}${cleanPath}`;
};

/**
 * Redirect browser to a specific domain and path
 */
export const redirectToDomain = (targetDomain: AppDomain, path: string = '/') => {
  if (typeof window === 'undefined') return;

  const targetUrl = getDomainUrl(targetDomain, path);
  const isLocalhost = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
  
  if (isLocalhost) {
    // Check if current search query already matches
    const searchParams = new URLSearchParams(window.location.search);
    const simulated = searchParams.get('domain');
    if (simulated === targetDomain && window.location.pathname === path) {
      return;
    }
  }

  if (window.location.href !== targetUrl) {
    window.location.href = targetUrl;
  }
};

