import React from 'react';
import { useLocation } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
  title: string;
}

export default function RouteErrorBoundary({ children, title }: RouteErrorBoundaryProps) {
  const location = useLocation();

  return (
    <ErrorBoundary key={`${location.pathname}${location.search}`} title={title}>
      {children}
    </ErrorBoundary>
  );
}
