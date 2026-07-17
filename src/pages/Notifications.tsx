import React from 'react';
import Header from '@/components/Header';
import NotificationsPanel from '@/components/student/NotificationsPanel';
import { Bell } from 'lucide-react';

const Notifications = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="container max-w-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Notifications</h1>
              <p className="text-sm text-muted-foreground">Updates on your assignments, results, and activity</p>
            </div>
          </div>

          <NotificationsPanel />
        </div>
      </main>
    </div>
  );
};

export default Notifications;
