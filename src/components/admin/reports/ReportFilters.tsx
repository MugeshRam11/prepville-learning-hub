import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';

interface Props {
  period: string;
  onPeriodChange: (val: string) => void;
  subject: string;
  onSubjectChange: (val: string) => void;
  onExportPDF: () => void;
  onRefresh: () => void;
  loading: boolean;
}

const ReportFilters: React.FC<Props> = ({
  period, onPeriodChange, subject, onSubjectChange, onExportPDF, onRefresh, loading
}) => (
  <div className="flex flex-wrap items-center gap-3">
    <Select value={period} onValueChange={onPeriodChange}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7days">Last 7 Days</SelectItem>
        <SelectItem value="30days">Last 30 Days</SelectItem>
        <SelectItem value="90days">Last 90 Days</SelectItem>
      </SelectContent>
    </Select>

    <Select value={subject} onValueChange={onSubjectChange}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Subjects</SelectItem>
        <SelectItem value="mathematics">Mathematics</SelectItem>
        <SelectItem value="physics">Physics</SelectItem>
        <SelectItem value="chemistry">Chemistry</SelectItem>
        <SelectItem value="biology">Biology</SelectItem>
        <SelectItem value="english">English</SelectItem>
      </SelectContent>
    </Select>

    <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading}>
      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
    </Button>

    <Button onClick={onExportPDF} disabled={loading} className="bg-primary hover:bg-primary/90">
      <Download className="w-4 h-4 mr-2" />
      Download PDF Report
    </Button>
  </div>
);

export default ReportFilters;
