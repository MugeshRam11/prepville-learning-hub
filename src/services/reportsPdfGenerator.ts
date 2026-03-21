import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  OverviewStats,
  TopicPerformance,
  SubjectDistribution,
  ScoreDistribution,
} from './reportsService';

export interface StudentPerformance {
  name: string;
  email: string;
  attempts: number;
  avgScore: number;
  totalTimeMinutes: number;
}

interface ReportData {
  period: string;
  subject: string;
  stats: OverviewStats | null;
  topicPerformance: TopicPerformance[];
  subjectDistribution: SubjectDistribution[];
  scoreDistribution: ScoreDistribution[];
  students: StudentPerformance[];
}

const PRIMARY_COLOR: [number, number, number] = [34, 80, 148];
const ACCENT_COLOR: [number, number, number] = [79, 70, 229];
const LIGHT_BG: [number, number, number] = [243, 244, 246];

function addHeader(doc: jsPDF, title: string) {
  // Brand bar
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Prep Ville', 14, 13);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 21);

  doc.setTextColor(0, 0, 0);
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const y = 285;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y - 4, 196, y - 4);

  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(`Page ${pageNum} of ${totalPages}`, 14, y);
  doc.text(`Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`, 196, y, { align: 'right' });
  doc.setTextColor(0, 0, 0);
}

function addMetricCard(doc: jsPDF, x: number, y: number, w: number, label: string, value: string) {
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(x, y, w, 22, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(label, x + w / 2, y + 8, { align: 'center' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(value, x + w / 2, y + 18, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
}

export function generateReportPDF(data: ReportData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const periodLabel = data.period === '7days' ? 'Last 7 Days' : data.period === '30days' ? 'Last 30 Days' : 'Last 90 Days';
  const subjectLabel = data.subject !== 'all' ? data.subject.replace(/\b\w/g, c => c.toUpperCase()) : 'All Subjects';

  // ===== PAGE 1 — Overview =====
  addHeader(doc, 'Progress Report & Analytics');

  // Period & Subject badge
  let curY = 36;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Report Period: ${periodLabel}`, 14, curY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Subject: ${subjectLabel}`, 120, curY);

  // Overview cards
  curY = 46;
  const s = data.stats;
  const cardW = 43;
  const gap = 3;
  addMetricCard(doc, 14, curY, cardW, 'Total Attempts', s ? String(s.totalAttempts) : '0');
  addMetricCard(doc, 14 + cardW + gap, curY, cardW, 'Average Score', s ? `${s.averageScore}%` : '0%');
  addMetricCard(doc, 14 + (cardW + gap) * 2, curY, cardW, 'Active Users', s ? String(s.activeUsers) : '0');
  addMetricCard(doc, 14 + (cardW + gap) * 3, curY, cardW, 'Avg Time', s ? `${s.averageTimeMinutes}m` : '0m');

  // Topic Performance table
  curY = 78;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ACCENT_COLOR);
  doc.text('Topic Performance', 14, curY);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  if (data.topicPerformance.length > 0) {
    autoTable(doc, {
      startY: curY + 4,
      head: [['Topic', 'Avg Score (%)', 'Attempts']],
      body: data.topicPerformance.map(t => [t.topic, String(t.averageScore), String(t.attempts)]),
      headStyles: { fillColor: PRIMARY_COLOR, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      margin: { left: 14, right: 14 },
      tableWidth: 'auto',
    });
    curY = (doc as any).lastAutoTable.finalY + 8;
  } else {
    curY += 10;
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('No topic data available for this period.', 14, curY);
    doc.setTextColor(0, 0, 0);
    curY += 8;
  }

  // Subject Distribution table
  if (curY < 220) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ACCENT_COLOR);
    doc.text('Subject Distribution', 14, curY);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    if (data.subjectDistribution.length > 0) {
      const total = data.subjectDistribution.reduce((s, d) => s + d.value, 0);
      autoTable(doc, {
        startY: curY + 4,
        head: [['Subject', 'Attempts', 'Share (%)']],
        body: data.subjectDistribution.map(d => [
          d.name,
          String(d.value),
          total > 0 ? `${Math.round((d.value / total) * 100)}%` : '0%',
        ]),
        headStyles: { fillColor: PRIMARY_COLOR, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        margin: { left: 14, right: 14 },
        tableWidth: 'auto',
      });
      curY = (doc as any).lastAutoTable.finalY + 8;
    } else {
      curY += 10;
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text('No subject data available.', 14, curY);
      doc.setTextColor(0, 0, 0);
      curY += 8;
    }
  }

  // Score Distribution table
  if (curY < 240) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ACCENT_COLOR);
    doc.text('Score Distribution', 14, curY);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    if (data.scoreDistribution.some(s => s.count > 0)) {
      autoTable(doc, {
        startY: curY + 4,
        head: [['Score Range', 'Students']],
        body: data.scoreDistribution.map(s => [s.range, String(s.count)]),
        headStyles: { fillColor: PRIMARY_COLOR, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        margin: { left: 14, right: 14 },
        tableWidth: 'auto',
      });
    }
  }

  // ===== PAGE 2 — Student Performance =====
  doc.addPage();
  addHeader(doc, 'Student Performance Breakdown');

  curY = 36;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Period: ${periodLabel} | Subject: ${subjectLabel}`, 14, curY);
  doc.setFont('helvetica', 'normal');

  if (data.students.length > 0) {
    autoTable(doc, {
      startY: curY + 6,
      head: [['#', 'Student Name', 'Email', 'Attempts', 'Avg Score (%)', 'Total Time']],
      body: data.students.map((st, i) => [
        String(i + 1),
        st.name || 'Unknown',
        st.email || '—',
        String(st.attempts),
        `${st.avgScore}%`,
        `${st.totalTimeMinutes}m`,
      ]),
      headStyles: { fillColor: PRIMARY_COLOR, fontSize: 8, cellPadding: 3 },
      bodyStyles: { fontSize: 8, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 40 },
        2: { cellWidth: 50 },
        3: { cellWidth: 20 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
      },
      didDrawPage: () => {
        // Header on continuation pages
        addHeader(doc, 'Student Performance Breakdown');
      },
    });
  } else {
    curY += 14;
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('No student performance data available for this period.', 14, curY);
    doc.setTextColor(0, 0, 0);
  }

  // ===== Add footers to all pages =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  doc.save(`PrepVille_Report_${data.period}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
