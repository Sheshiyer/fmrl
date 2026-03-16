/**
 * Selemene Engine - Legacy App Component
 * 
 * NOTE: This file is kept for backward compatibility.
 * The application now uses React Router via main.tsx.
 * 
 * This component can be used for testing or embedded scenarios
 * where routing is not needed.
 */
import { AppProvider } from './context/AppContext';

// Simple placeholder when used standalone
export function App() {
  return (
    <AppProvider>
      <div className="h-screen flex items-center justify-center bg-pip-bg text-pip-text-primary">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Selemene Engine</h1>
          <p className="text-pip-text-secondary">
            Please use the router-enabled entry point (main.tsx) for full functionality.
          </p>
        </div>
      </div>
    </AppProvider>
  );
}

export default App;
