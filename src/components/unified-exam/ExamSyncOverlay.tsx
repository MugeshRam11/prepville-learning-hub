import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Pause, Lock, WifiOff } from 'lucide-react';
import { useExamSync } from '@/contexts/ExamSyncContext';
import { cn } from '@/lib/utils';

interface ExamSyncOverlayProps {
  onForceNavigate?: () => void;
}

const ExamSyncOverlay: React.FC<ExamSyncOverlayProps> = ({ onForceNavigate }) => {
  const { session, isConnected, isPrimaryTab, connectionError } = useExamSync();

  // No overlay needed for normal state
  if (isConnected && isPrimaryTab && session?.examState === 'LIVE' && !session?.isLocked) {
    return null;
  }

  // Paused state
  if (session?.examState === 'PAUSED') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-yellow-900/90 flex items-center justify-center"
      >
        <div className="text-center p-8 max-w-md">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Pause className="w-24 h-24 mx-auto text-yellow-300 mb-6" />
          </motion.div>
          <h2 className="text-3xl font-bold text-white mb-4">Exam Paused</h2>
          <p className="text-yellow-100 text-lg">
            The administrator has paused this exam. Please wait for further instructions.
          </p>
          <p className="text-yellow-200/70 text-sm mt-4">
            Your progress has been saved. The timer is stopped.
          </p>
        </div>
      </motion.div>
    );
  }

  // Locked state
  if (session?.isLocked) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-red-900/90 flex items-center justify-center"
      >
        <div className="text-center p-8 max-w-md">
          <Lock className="w-24 h-24 mx-auto text-red-300 mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">Session Locked</h2>
          <p className="text-red-100 text-lg">
            Your exam session has been locked by an administrator.
          </p>
          <p className="text-red-200/70 text-sm mt-4">
            Please contact your teacher or supervisor for assistance.
          </p>
        </div>
      </motion.div>
    );
  }

  // Secondary tab state
  if (!isPrimaryTab) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-slate-900/95 flex items-center justify-center"
      >
        <div className="text-center p-8 max-w-md">
          <AlertTriangle className="w-24 h-24 mx-auto text-amber-400 mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">Duplicate Tab Detected</h2>
          <p className="text-slate-200 text-lg mb-6">
            This exam is already open in another tab or device.
          </p>
          <p className="text-slate-300 text-sm">
            Only one active session is allowed per exam. Please close this tab and continue in your original session.
          </p>
        </div>
      </motion.div>
    );
  }

  // Connection error state
  if (!isConnected || connectionError) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <div className="bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <WifiOff className="w-5 h-5" />
          <span className="text-sm font-medium">
            Connection lost. Reconnecting...
          </span>
        </div>
      </motion.div>
    );
  }

  // Cancelled state
  if (session?.examState === 'CANCELLED') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-slate-900/95 flex items-center justify-center"
      >
        <div className="text-center p-8 max-w-md">
          <AlertTriangle className="w-24 h-24 mx-auto text-red-400 mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">Exam Cancelled</h2>
          <p className="text-slate-200 text-lg">
            This exam has been cancelled by the administrator.
          </p>
          <button
            onClick={onForceNavigate}
            className="mt-6 px-6 py-3 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition"
          >
            Return to Home
          </button>
        </div>
      </motion.div>
    );
  }

  return null;
};

export default ExamSyncOverlay;
