import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="h-full flex items-center justify-center bg-pip-bg p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-xl font-semibold text-pip-text-primary">Something went wrong</h2>
            <p className="text-sm text-pip-text-secondary">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                className="mystic-btn mystic-btn-primary"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
              >
                Try Again
              </button>
              <button
                className="mystic-btn mystic-btn-ghost"
                onClick={() => window.location.reload()}
              >
                Reload App
              </button>
            </div>
            <details className="text-left text-xs text-pip-text-muted mt-4">
              <summary className="cursor-pointer">Technical details</summary>
              <pre className="mt-2 p-2 bg-black/30 rounded overflow-auto max-h-40">
                {this.state.error?.stack}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
