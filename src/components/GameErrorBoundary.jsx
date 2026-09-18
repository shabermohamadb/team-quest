import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import socket from '../utils/socket';

export default class GameErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[GAME ERROR BOUNDARY] Uncaught error caught by boundary:', error, errorInfo);
  }

  handleRefresh = () => {
    console.log('[GAME] Re-syncing state via Error Boundary...');
    socket.emit('get_game_state', {}, () => {
      this.setState({ hasError: false, error: null });
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070A12] text-slate-100 flex items-center justify-center p-6 font-mono">
          <div className="max-w-md w-full bg-[#0E1524] border border-amber-500/40 rounded-2xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black text-amber-400 tracking-wider uppercase">
                TEAM QUEST · SYNC ERROR
              </h1>
              <p className="text-sm text-slate-300 font-sans">
                A temporary display issue occurred while updating game state.
              </p>
            </div>

            <button
              onClick={this.handleRefresh}
              className="w-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black py-3.5 px-6 rounded-xl text-sm tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              [ RECONNECT & SYNC ]
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
