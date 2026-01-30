import React, { useEffect, useState } from 'react';
import StudentDashboard from '@/components/student/StudentDashboard';
import DailyMotivationPopup from '@/components/student/DailyMotivationPopup';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const StudentDashboardPage = () => {
  const { user, isDemo } = useAuth();
  const [userName, setUserName] = useState<string>();

  useEffect(() => {
    // Demo users get a default name, skip database fetch
    if (isDemo) {
      setUserName('Demo User');
      return;
    }

    if (user?.id) {
      supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.first_name) setUserName(data.first_name);
        });
    }
  }, [user?.id, isDemo]);

  return (
    <>
      {/* Skip the edge function call for demo users by passing a prop */}
      <DailyMotivationPopup userName={userName} skipFetch={isDemo} />
      <StudentDashboard />
    </>
  );
};

export default StudentDashboardPage;
