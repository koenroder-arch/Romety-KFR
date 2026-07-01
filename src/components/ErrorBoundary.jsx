import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("[ErrorBoundary] Caught React crash:", error, errorInfo);
  }

  handleReset = () => {
    window.location.replace('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div 
          className="min-h-screen flex flex-col justify-center items-center px-6 py-12 text-center"
          style={{ background: '#08090E', fontFamily: "'Inter', sans-serif" }}
        >
          <div className="w-full max-w-md space-y-6">
            {/* Error Graphic */}
            <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(239,68,68,0.15)]">
              <span className="text-4xl">⚠️</span>
            </div>

            <div>
              <h1 className="text-2xl font-black text-white tracking-tight mb-2">Er ging iets mis</h1>
              <p className="text-sm text-white/60 leading-relaxed">
                Er is een onverwachte fout opgetreden bij het laden van dit scherm. Geen zorgen, we kunnen je terugbrengen.
              </p>
            </div>

            <button
              onClick={this.handleReset}
              className="w-full py-4 rounded-[18px] font-black text-base transition-all text-white shadow-lg active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)',
                boxShadow: '0 8px 24px rgba(255,75,114,0.35)'
              }}
            >
              Terug naar startscherm
            </button>

            {/* Error Details Accordion */}
            {this.state.error && (
              <div className="pt-4 border-t border-white/10 text-left">
                <button
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  className="text-xs font-bold text-white/40 hover:text-white/60 flex items-center gap-1.5 transition-colors focus:outline-none"
                >
                  <span>{this.state.showDetails ? '▼' : '▶'}</span>
                  <span>Foutdetails weergeven</span>
                </button>

                {this.state.showDetails && (
                  <pre 
                    className="mt-3 p-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] text-red-300 overflow-x-auto max-h-48 font-mono leading-relaxed"
                  >
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
