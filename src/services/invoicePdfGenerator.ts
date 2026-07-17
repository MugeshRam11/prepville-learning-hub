import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BRAND_BLUE: [number, number, number] = [0, 123, 255]; // --adsavvy-blue
const BRAND_PINK: [number, number, number] = [255, 71, 133]; // --adsavvy-pink

export interface PlatformInvoiceForPdf {
  invoice_number: string;
  billing_month: string;
  plan_amount: number;
  ai_overage_amount: number;
  total_amount: number;
  status: string;
  issued_at: string;
  due_at: string | null;
}

export function generateInvoicePdf(invoice: PlatformInvoiceForPdf, planName: string) {
  const doc = new jsPDF();

  // Brand header bar
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('AdSavvy', 14, 15);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Grow Your Business Digitally', 14, 22);
  doc.setTextColor(0, 0, 0);

  // Invoice meta
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Monthly Maintenance Invoice', 14, 42);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const billingMonthLabel = new Date(invoice.billing_month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const metaRows: [string, string][] = [
    ['Invoice Number', invoice.invoice_number],
    ['Plan', planName],
    ['Billing Month', billingMonthLabel],
    ['Issued', new Date(invoice.issued_at).toLocaleDateString('en-GB')],
    ['Due', invoice.due_at ? new Date(invoice.due_at).toLocaleDateString('en-GB') : '—'],
    ['Status', invoice.status.toUpperCase()],
  ];

  let y = 50;
  for (const [label, value] of metaRows) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 60, y);
    y += 6;
  }

  autoTable(doc, {
    startY: y + 6,
    head: [['Line Item', 'Amount (USD)']],
    body: [
      ['Base plan (Supabase + Vercel + AI allowance)', `$${Number(invoice.plan_amount).toFixed(2)}`],
      ['AI usage overage (beyond included allowance)', `$${Number(invoice.ai_overage_amount).toFixed(2)}`],
    ],
    foot: [['Total Due', `$${Number(invoice.total_amount).toFixed(2)}`]],
    headStyles: { fillColor: BRAND_BLUE, fontSize: 10 },
    footStyles: { fillColor: BRAND_PINK, fontSize: 11, fontStyle: 'bold' },
    bodyStyles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || y + 30;
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(
    'Generated automatically from live Supabase + AI usage data. Contact AdSavvy for billing questions.',
    14,
    finalY + 12
  );

  doc.save(`${invoice.invoice_number}.pdf`);
}
