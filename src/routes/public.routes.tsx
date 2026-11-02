import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from './routeConstants';
import DomainRedirect from './DomainRedirect';

// Lazy-loaded Public Pages
const Index = lazy(() => import('@/pages/Index'));
const Pricing = lazy(() => import('@/pages/Pricing'));
const CommandTerms = lazy(() => import('@/pages/CommandTerms'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('@/pages/TermsOfService'));
const NotFound = lazy(() => import('@/pages/NotFound'));

export const PublicRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Primary Public Pages */}
      <Route path={ROUTES.PUBLIC.HOME} element={<Index />} />
      <Route path={ROUTES.PUBLIC.PRICING} element={<Pricing />} />
      <Route path={ROUTES.PUBLIC.COMMAND_TERMS} element={<CommandTerms />} />
      <Route path={ROUTES.PUBLIC.PRIVACY} element={<PrivacyPolicy />} />
      <Route path={ROUTES.PUBLIC.TERMS} element={<TermsOfService />} />

      {/* Public Shortcuts */}
      <Route
        path={ROUTES.PUBLIC.STUDENT_LOGIN}
        element={<DomainRedirect domain="student" path={ROUTES.STUDENT.LOGIN} />}
      />
      <Route
        path={ROUTES.PUBLIC.STUDENT_REGISTER}
        element={<DomainRedirect domain="student" path={ROUTES.STUDENT.REGISTER} />}
      />
      <Route
        path={ROUTES.PUBLIC.ADMIN_LOGIN}
        element={<DomainRedirect domain="admin" path={ROUTES.ADMIN.LOGIN} />}
      />

      {/* Legacy URL Aliases for Backward Compatibility */}
      <Route path="/login" element={<Navigate to={ROUTES.PUBLIC.STUDENT_LOGIN} replace />} />
      <Route path="/register" element={<Navigate to={ROUTES.PUBLIC.STUDENT_REGISTER} replace />} />
      <Route path="/signup" element={<Navigate to={ROUTES.PUBLIC.STUDENT_REGISTER} replace />} />
      <Route path="/auth" element={<Navigate to={ROUTES.PUBLIC.STUDENT_REGISTER} replace />} />
      <Route path="/admin/login" element={<Navigate to={ROUTES.PUBLIC.ADMIN_LOGIN} replace />} />
      <Route path="/admin" element={<Navigate to={ROUTES.PUBLIC.ADMIN_LOGIN} replace />} />

      {/* Fallback 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default PublicRoutes;
