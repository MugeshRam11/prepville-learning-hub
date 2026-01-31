import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const QuickPractice = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/practice', { replace: true });
  }, [navigate]);
  
  return null;
};

export default QuickPractice;
