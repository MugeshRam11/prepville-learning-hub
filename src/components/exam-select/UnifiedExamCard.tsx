import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Grid3X3, GripVertical, MousePointer, Calculator, Play } from 'lucide-react';
import ExamModeCard from './ExamModeCard';

const UnifiedExamCard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <ExamModeCard
      icon={Layers}
      iconGradient="bg-gradient-to-br from-emerald-500 to-teal-600"
      title="Unified Mock Exam"
      badge={{
        text: "RECOMMENDED",
        gradient: "bg-gradient-to-r from-emerald-500 to-teal-600"
      }}
      description="All questions on one scrollable page - IB exam style flow"
      features={[
        {
          icon: Grid3X3,
          title: "Graph Plotting",
          subtitle: "Interactive diagrams",
          bgColor: "bg-emerald-500/5 border-emerald-500/10",
          iconColor: "text-emerald-600"
        },
        {
          icon: GripVertical,
          title: "Drag & Drop",
          subtitle: "Match answers",
          bgColor: "bg-teal-500/5 border-teal-500/10",
          iconColor: "text-teal-600"
        },
        {
          icon: MousePointer,
          title: "Image Zones",
          subtitle: "Click to answer",
          bgColor: "bg-cyan-500/5 border-cyan-500/10",
          iconColor: "text-cyan-600"
        },
        {
          icon: Calculator,
          title: "Smart Math",
          subtitle: "LaTeX equations",
          bgColor: "bg-green-500/5 border-green-500/10",
          iconColor: "text-green-600"
        }
      ]}
      stats="<strong>Unified Interface</strong> • Supports all interactive answer blocks • Auto-detects question types"
      borderColor="border-emerald-500/30"
      bgGradient="bg-gradient-to-br from-card via-card to-emerald-500/5"
      primaryButton={{
        icon: Play,
        text: "Start Unified Exam",
        gradient: "bg-gradient-to-r from-emerald-500 to-teal-600",
        onClick: () => navigate('/mock-exams/unified')
      }}
      animationDelay={0}
    />
  );
};

export default UnifiedExamCard;
