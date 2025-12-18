import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error details
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="page-container">
          <div className="error-boundary">
            <div className="error-icon">⚠️</div>
            <h2>Something went wrong</h2>
            <p>We're sorry, but something unexpected happened.</p>
            <button 
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
            {process.env.NODE_ENV === 'development' && (
              <details style={{ marginTop: '20px', textAlign: 'left' }}>
                <summary>Error Details (Development)</summary>
                <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 