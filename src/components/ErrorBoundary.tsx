import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected system error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Kobujoi CDF ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  public render() {
    if (this.state.hasError) {
      let parsedDetails: {
        error?: string;
        operationType?: string;
        path?: string | null;
      } | null = null;

      try {
        parsedDetails = JSON.parse(this.state.errorMessage);
      } catch {
        parsedDetails = null;
      }

      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-md p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-amber-800">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold text-slate-900">
                System Operation Notice
              </h2>
            </div>

            {parsedDetails && parsedDetails.operationType ? (
              <div className="space-y-2 text-xs text-slate-700 bg-amber-50/70 border border-amber-200 p-3.5 rounded">
                <p className="font-semibold text-amber-950">
                  Database Security Policy Restriction ({parsedDetails.operationType.toUpperCase()})
                </p>
                <p>
                  Target Resource: <code className="font-mono">{parsedDetails.path || 'Firestore'}</code>
                </p>
                <p className="text-slate-600">{parsedDetails.error}</p>
                <p className="text-slate-600 pt-1">
                  Ensure you are signed in with an authorized account (Student, CDF Staff, or Administrator) for this operation.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed">
                {this.state.errorMessage}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#0F4C3A] hover:bg-[#0B382B] text-white text-xs font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Return to Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
