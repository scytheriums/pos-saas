'use client';

import React from 'react';

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    context?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error(`[ErrorBoundary${this.props.context ? ` – ${this.props.context}` : ''}]`, error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center gap-4">
                    <div className="text-4xl">⚠️</div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground mb-1">Something went wrong</h2>
                        <p className="text-sm text-muted-foreground max-w-md">
                            {this.props.context
                                ? `The ${this.props.context} section encountered an error.`
                                : 'An unexpected error occurred.'}
                            {' '}Please refresh the page or contact support if the problem persists.
                        </p>
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                        Try again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
