import { Link } from 'react-router-dom';
export default function Subscription() {
  return (
    <section className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Plan &amp; Billing</h1>
      <p>Free preview · IB MYP Mathematics</p>
      <p>Payment Gateway &amp; Autopay: Pending Integration</p>
      <p>Billing portal and invoices will appear when billing is available.</p>
      <Link to="/dashboard">Return to dashboard</Link>
    </section>
  );
}
