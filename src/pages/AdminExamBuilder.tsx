import React from 'react';
import { ExamBuilder } from '@/components/exam-builder';

const AdminExamBuilder = () => {
  const handleSave = async (state: any) => {
    console.log('Saving exam:', state);
    // TODO: Implement save to Supabase
  };

  return <ExamBuilder onSave={handleSave} />;
};

export default AdminExamBuilder;
