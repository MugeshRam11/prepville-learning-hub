import React, { useEffect, useState } from 'react';
import StudentDashboard from '@/components/student/StudentDashboard';
import DailyMotivationPopup from '@/components/student/DailyMotivationPopup';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const StudentDashboardPage = () => {
  const { user } = useAuth();
  const [userName, setUserName] = useState<string>();

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.first_name) setUserName(data.first_name);
        });
    }
  }, [user]);

  return (
    <>
      <DailyMotivationPopup userName={userName} />
      <StudentDashboard />
    </>
  );
};

export default StudentDashboardPage;
