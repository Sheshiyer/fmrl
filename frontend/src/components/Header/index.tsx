/**
 * Header Component
 */
import { Settings, Download, User, Activity } from 'lucide-react';
import { useAppState } from '../../context/appState';

export function Header() {
  const { state, dispatch } = useAppState();

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-gray-900/80 backdrop-blur border-b border-gray-800">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">PIP Analysis</h1>
          <p className="text-xs text-gray-500">Polycontrast Interference Photography</p>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            state.isConnected ? 'bg-green-500' : 'bg-gray-500'
          }`}
        />
        <span className="text-sm text-gray-400">
          {state.isConnected ? 'Connected' : 'Offline'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Export Button */}
        <button
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="Export Data"
        >
          <Download className="w-5 h-5" />
        </button>

        {/* Settings Button */}
        <button
          onClick={() => dispatch({ type: 'SET_SHOW_SETTINGS', payload: true })}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* User Profile */}
        <button
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="Profile"
        >
          <User className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

export default Header;
