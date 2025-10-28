'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ConfettiErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Confetti error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Silently fail - don't show anything if confetti breaks
      return null;
    }

    return this.props.children;
  }
}
