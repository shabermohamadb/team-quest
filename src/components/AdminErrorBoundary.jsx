import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import socket from '../utils/socket';

export default class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ADMIN ERROR BOUNDARY] Uncaught error caught by boundary:', error, errorInfo);
  }

  handleRefresh = () => {
    console.log('[ADMIN] Refreshing game state via Error Boundary...');
    socket.emit('admin_refresh_state');
    const savedToken = sessionStorage.getItem('team_quest_admin_token') || '';
    const savedPin = sessionStorage.getItem('team_quest_admin_pin') || '';
    if (savedToken || savedPin) {
      socket.emit('admin_auth', { token: savedToken, pin: savedPin });
    }
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070A12] text-slate-100 flex items-center justify-center p-6 font-mono">
          <div className="max-w-md w-full bg-[#0E1524] border border-rose-500/40 rounded-2xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-rose-400 tracking-wider uppercase">
                # GAME UI ERROR
              </h1>
              <p className="text-sm text-slate-300 font-sans">
                Unable to load the current game state.
              </p>
              {this.state.error?.message && (
                <div className="p-3 bg-black/40 rounded-lg text-xs text-rose-300/80 text-left overflow-x-auto max-h-32 border border-rose-950">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <button
              onClick={this.handleRefresh}
              className="w-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black py-3.5 px-6 rounded-xl text-sm tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              [ REFRESH GAME STATE ]
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
