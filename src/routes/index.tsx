import React, { Suspense } from 'react';
import { getActiveDomain } from '@/lib/domain';
import PublicRoutes from './public.routes';
import StudentRoutes from './student.routes';
import AdminRoutes from './admin.routes';

export * from './routeConstants';
export * from './DomainRedirect';

const RouteLoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

export const AppRouter: React.FC = () => {
  const activeDomain = getActiveDomain();

  return (
    <Suspense fallback={<RouteLoadingSpinner />}>
      {activeDomain === 'www' && <PublicRoutes />}
      {activeDomain === 'student' && <StudentRoutes />}
      {activeDomain === 'admin' && <AdminRoutes />}
    </Suspense>
  );
};

export default AppRouter;
