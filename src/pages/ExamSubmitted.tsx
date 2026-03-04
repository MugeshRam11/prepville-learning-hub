import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Clock, Bell, Home, FileText } from 'lucide-react';
import Header from '@/components/Header';

const ExamSubmitted = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { testTitle } = location.state || {};

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-lg w-full"
        >
          <Card className="border-0 shadow-xl">
            <CardContent className="pt-10 pb-8 px-8 text-center space-y-6">
              {/* Success icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
              >
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </motion.div>

              {/* Title */}
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  Exam Submitted Successfully!
                </h1>
                {testTitle && (
                  <p className="text-muted-foreground font-medium">{testTitle}</p>
                )}
              </div>

              {/* Result ETA */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-5 space-y-3"
              >
                <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-400">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold text-lg">Results within 24 hours</span>
                </div>
                <p className="text-sm text-amber-600 dark:text-amber-500">
                  Your answers are being reviewed by our evaluators. You will receive your detailed score, corrections, and improvement suggestions once the evaluation is complete.
                </p>
              </motion.div>

              {/* Notification note */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-3 bg-muted/50 rounded-lg p-4 text-left"
              >
                <Bell className="w-5 h-5 text-primary shrink-0" />
                <p className="text-sm text-muted-foreground">
                  You will be notified via email once your results are published. You can also check your results in the dashboard.
                </p>
              </motion.div>

              {/* Status info */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">Pending Evaluation</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Submitted at</span>
                  <span className="font-medium">{new Date().toLocaleString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => navigate('/dashboard')}
                >
                  <Home className="w-4 h-4" />
                  Go to Dashboard
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() => navigate('/mock-exams/select')}
                >
                  <FileText className="w-4 h-4" />
                  Take Another Exam
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default ExamSubmitted;
