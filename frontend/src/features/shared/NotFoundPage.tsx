import { Link } from 'react-router-dom';
import { ArrowLeft, Home, SearchX } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <div
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgb(var(--color-primary-50))', color: 'rgb(var(--color-primary-700))' }}
        >
          <SearchX className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold uppercase" style={{ color: 'rgb(var(--color-primary-700))' }}>
          404
        </p>
        <h1 className="mt-2 text-2xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-6" style={{ color: 'rgb(var(--color-text-muted))' }}>
          The page may have moved, expired, or never existed.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={() => window.history.back()} className="btn-secondary btn-sm">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Go back
          </button>
          <Link to="/" className="btn-primary btn-sm">
            <Home className="h-4 w-4" aria-hidden="true" />
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
