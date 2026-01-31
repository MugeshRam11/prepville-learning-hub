import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Pause, 
  Play, 
  Send, 
  Clock, 
  XCircle, 
  Lock, 
  Unlock,
  Users,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useAdminExamControl } from '@/hooks/useAdminExamControl';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface AdminExamControlPanelProps {
  testId: string;
  testTitle: string;
}

const AdminExamControlPanel: React.FC<AdminExamControlPanelProps> = ({
  testId,
  testTitle,
}) => {
  const {
    activeStudents,
    isLoading,
    pauseExam,
    resumeExam,
    forceSubmit,
    extendTime,
    cancelExam,
    lockStudent,
    unlockStudent,
    refreshActiveStudents,
  } = useAdminExamControl();

  const [extensionMinutes, setExtensionMinutes] = useState(15);
  const [examState, setExamState] = useState<string>('LIVE');
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    refreshActiveStudents(testId);
    const interval = setInterval(() => refreshActiveStudents(testId), 10000);
    return () => clearInterval(interval);
  }, [testId, refreshActiveStudents]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel(`admin-exam-${testId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exam_sessions',
          filter: `test_id=eq.${testId}`,
        },
        () => {
          refreshActiveStudents(testId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [testId, refreshActiveStudents]);

  const handleAction = async (action: string, userId?: string) => {
    if (confirmAction !== action) {
      setConfirmAction(action);
      setTimeout(() => setConfirmAction(null), 3000);
      return;
    }

    setConfirmAction(null);

    switch (action) {
      case 'pause':
        await pauseExam(testId, userId);
        setExamState('PAUSED');
        break;
      case 'resume':
        await resumeExam(testId, userId);
        setExamState('LIVE');
        break;
      case 'force_submit':
        await forceSubmit(testId, userId);
        break;
      case 'cancel':
        await cancelExam(testId, userId);
        setExamState('CANCELLED');
        break;
      case 'extend':
        await extendTime(testId, extensionMinutes, userId);
        break;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'LIVE': return 'bg-green-500';
      case 'PAUSED': return 'bg-yellow-500';
      case 'SUBMITTED': return 'bg-blue-500';
      case 'CANCELLED': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Live Exam Control
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={cn(getStateColor(examState), 'text-white')}>
              {examState}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refreshActiveStudents(testId)}
              disabled={isLoading}
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{testTitle}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Global Actions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Global Actions</h4>
          
          <div className="grid grid-cols-2 gap-2">
            {examState === 'LIVE' ? (
              <Button
                variant="outline"
                className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                onClick={() => handleAction('pause')}
              >
                <Pause className="w-4 h-4 mr-2" />
                {confirmAction === 'pause' ? 'Click to Confirm' : 'Pause All'}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="border-green-500 text-green-600 hover:bg-green-50"
                onClick={() => handleAction('resume')}
              >
                <Play className="w-4 h-4 mr-2" />
                {confirmAction === 'resume' ? 'Click to Confirm' : 'Resume All'}
              </Button>
            )}

            <Button
              variant="outline"
              className="border-blue-500 text-blue-600 hover:bg-blue-50"
              onClick={() => handleAction('force_submit')}
            >
              <Send className="w-4 h-4 mr-2" />
              {confirmAction === 'force_submit' ? 'Confirm Submit' : 'Force Submit All'}
            </Button>
          </div>

          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              max={120}
              value={extensionMinutes}
              onChange={(e) => setExtensionMinutes(parseInt(e.target.value) || 15)}
              className="w-24"
            />
            <Button
              variant="outline"
              className="flex-1 border-primary text-primary hover:bg-primary/10"
              onClick={() => handleAction('extend')}
            >
              <Clock className="w-4 h-4 mr-2" />
              {confirmAction === 'extend' ? 'Confirm Extend' : `Extend by ${extensionMinutes}min`}
            </Button>
          </div>

          <Button
            variant="outline"
            className="w-full border-red-500 text-red-600 hover:bg-red-50"
            onClick={() => handleAction('cancel')}
          >
            <XCircle className="w-4 h-4 mr-2" />
            {confirmAction === 'cancel' ? 'Confirm Cancel' : 'Cancel Exam'}
          </Button>
        </div>

        {/* Active Students */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">
              Active Students ({activeStudents.length})
            </h4>
          </div>

          {activeStudents.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No active students
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activeStudents.map((student) => (
                <motion.div
                  key={student.userId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {student.email || student.userId.slice(0, 8)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Q: {student.currentQuestion || '-'}</span>
                      <span>•</span>
                      <span>{formatTime(student.timeRemaining)}</span>
                      <Badge variant="outline" className="text-xs">
                        {student.examState}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => lockStudent(testId, student.userId)}
                      title="Lock student"
                    >
                      <Lock className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => forceSubmit(testId, student.userId)}
                      title="Force submit"
                    >
                      <Send className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Warning */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Admin actions are logged and propagate instantly to all students.</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminExamControlPanel;
