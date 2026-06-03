import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'rgb(var(--color-danger) / 0.1)' }}
            >
              <AlertTriangle className="w-8 h-8" style={{ color: 'rgb(var(--color-danger))' }} />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
              {this.props.title || 'Something went wrong'}
            </h2>
            <p className="text-sm mb-6" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={this.handleReset} className="btn-primary btn-sm">
                <RefreshCw className="w-4 h-4" />
                Try again
              </button>
              <a href="/" className="btn-secondary btn-sm">
                <Home className="w-4 h-4" />
                Go home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}