import React, { useEffect } from 'react';
import { AppDomain, getActiveDomain, getDomainUrl, redirectToDomain } from '@/lib/domain';

interface DomainRedirectProps {
  domain: AppDomain;
  path: string;
}

export const DomainRedirect: React.FC<DomainRedirectProps> = ({ domain, path }) => {
  useEffect(() => {
    // Validate target domain
    if (domain !== 'www' && domain !== 'student' && domain !== 'admin') {
      console.warn(`[DomainRedirect] Invalid domain specified: ${domain}`);
      return;
    }

    const currentDomain = getActiveDomain();
    const currentPathname = window.location.pathname;

    // Prevent infinite loop if already on target domain and path
    if (currentDomain === domain && currentPathname === path) {
      return;
    }

    redirectToDomain(domain, path);
  }, [domain, path]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Redirecting to {domain} portal...</span>
      </div>
    </div>
  );
};

export default DomainRedirect;
