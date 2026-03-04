/**
 * Capture Button Component with loading state and feedback
 */
import { Camera, Loader2, Check, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface CaptureButtonProps {
  onCapture: () => void;
  isCapturing: boolean;
  disabled?: boolean;
  progress?: number;
  error?: string | null;
  success?: boolean;
}

export function CaptureButton({
  onCapture,
  isCapturing,
  disabled = false,
  progress = 0,
  error = null,
  success = false,
}: CaptureButtonProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  // Show success feedback
  useEffect(() => {
    if (success && !isCapturing) {
      const showTimer = setTimeout(() => setShowSuccess(true), 0);
      const hideTimer = setTimeout(() => setShowSuccess(false), 2000);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [success, isCapturing]);

  // Show error feedback
  useEffect(() => {
    if (error) {
      const showTimer = setTimeout(() => setShowError(true), 0);
      const hideTimer = setTimeout(() => setShowError(false), 3000);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [error]);

  const getButtonState = () => {
    if (isCapturing) return 'capturing';
    if (showSuccess) return 'success';
    if (showError) return 'error';
    return 'idle';
  };

  const buttonState = getButtonState();

  const getButtonStyles = () => {
    switch (buttonState) {
      case 'capturing':
        return 'bg-indigo-700 cursor-wait';
      case 'success':
        return 'bg-green-600 hover:bg-green-700';
      case 'error':
        return 'bg-red-600 hover:bg-red-700';
      default:
        return 'bg-indigo-600 hover:bg-indigo-700';
    }
  };

  const renderIcon = () => {
    switch (buttonState) {
      case 'capturing':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'success':
        return <Check className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Camera className="w-5 h-5" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={onCapture}
        disabled={disabled || isCapturing}
        className={`relative p-3 text-white rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${getButtonStyles()}`}
        title={isCapturing ? `Capturing... ${progress}%` : 'Capture Frame for Analysis'}
      >
        {renderIcon()}
        
        {/* Progress ring */}
        {isCapturing && progress > 0 && (
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 48 48"
          >
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${(progress / 100) * 125.6} 125.6`}
              className="text-white/50"
            />
          </svg>
        )}
      </button>

      {/* Error tooltip */}
      {showError && error && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-red-600 text-white text-xs rounded whitespace-nowrap">
          {error}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-red-600" />
        </div>
      )}
    </div>
  );
}

export default CaptureButton;
