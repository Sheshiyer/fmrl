import React from 'react';
import { GlassCard } from '../Cards/GlassCard';
import { X, Share2, Save } from 'lucide-react';

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CaptureModal: React.FC<CaptureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <GlassCard className="w-full max-w-5xl h-[80vh] relative flex overflow-hidden !p-0 z-50 animate-in fade-in zoom-in duration-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 glass-button p-2 rounded-full"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Left: Image Preview */}
        <div className="w-2/3 bg-black/80 flex items-center justify-center relative border-r border-white/5">
           <div className="text-pip-text-muted flex flex-col items-center">
              <div className="w-64 h-48 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center mb-4">
                  <span>Image Preview</span>
              </div>
           </div>
        </div>

        {/* Right: Details */}
        <div className="w-1/3 flex flex-col bg-pip-dark/50">
           <div className="p-6 border-b border-white/5">
              <h2 className="text-xl font-semibold text-white mb-1">Analysis Result</h2>
              <div className="text-xs text-pip-text-muted">Captured on Oct 24, 14:30</div>
           </div>

           <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Scores Summary */}
              <div>
                  <h3 className="text-xs font-semibold text-pip-text-secondary uppercase mb-3">Composite Scores</h3>
                  <div className="grid grid-cols-2 gap-2">
                      {[
                          { l: 'Energy', v: 78, c: 'text-pip-success' },
                          { l: 'Symmetry', v: 85, c: 'text-pip-success' },
                          { l: 'Coherence', v: 62, c: 'text-pip-warning' },
                          { l: 'Complexity', v: 71, c: 'text-pip-success' },
                      ].map(s => (
                          <div key={s.l} className="bg-white/5 rounded-lg p-3">
                              <div className="text-[10px] text-pip-text-muted">{s.l}</div>
                              <div className={`text-lg font-bold ${s.c}`}>{s.v}</div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Notes */}
              <div>
                  <h3 className="text-xs font-semibold text-pip-text-secondary uppercase mb-3">Session Notes</h3>
                  <textarea 
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-pip-accent/50 resize-none h-24 placeholder:text-white/20"
                    placeholder="Add observations..."
                  ></textarea>
              </div>
           </div>

           {/* Footer Actions */}
           <div className="p-6 border-t border-white/5 flex gap-3">
              <button className="flex-1 glass-button justify-center py-2.5 bg-pip-accent/20 border-pip-accent/50 hover:bg-pip-accent/30 text-white">
                  <Save className="w-4 h-4 mr-2" />
                  Save Record
              </button>
              <button className="glass-button p-2.5">
                  <Share2 className="w-4 h-4" />
              </button>
           </div>
        </div>
      </GlassCard>
    </div>
  );
};
