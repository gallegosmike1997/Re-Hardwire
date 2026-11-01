'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Card } from './Card';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Re-Hardwire ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-[50vh] w-full max-w-md items-center justify-center p-4">
          <Card title="Something needs a reset" subtitle="An unexpected display issue occurred in this view." glow padded>
            <p className="text-xs leading-relaxed text-slate-300 mb-4">
              {this.state.error?.message || 'Your local data and support plans remain safely stored on this device.'}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }}
              >
                Reload App
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
