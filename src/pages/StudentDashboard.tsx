import {Link} from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import StudentDashboard from '@/components/student/StudentDashboard';
import DailyMotivationPopup from '@/components/student/DailyMotivationPopup';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { supabase } from '@/integrations/supabase/client';

const StudentDashboardPage = () => {
  const { user, isDemo } = useStudentAuth();
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
      <nav aria-label="Account" className="flex justify-end gap-4 p-3"><Link to="/settings">Account settings</Link><Link to="/support">Support</Link></nav>
      <StudentDashboard />
    </>
  );
};

export default StudentDashboardPage;
