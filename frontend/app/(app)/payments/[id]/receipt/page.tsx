"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { EmptyState, Loading, Notice, PageHeader } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { money, shortDate } from "@/lib/format";
import { useQuery } from "@/lib/useApi";
import type { Payment } from "@/lib/types";

export default function ReceiptPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const { data, loading, error } = useQuery<Payment>(`/payments/${params.id}/`);

  if (loading) return <Loading label="Loading receipt…" />;
  if (error) return <Notice>{error}</Notice>;
  if (!data) return <EmptyState title="Receipt not found" />;

  return (
    <>
      <PageHeader
        eyebrow="FINANCE"
        title="Payment receipt"
        description={data.receipt_number || `Payment #${data.id}`}
        action={
          <div className="ui-actions">
            <Link href="/fees" className="ui-ghost-button">
              Back to fees
            </Link>
            <button className="primary-button" onClick={() => window.print()}>
              <Printer size={16} />
              Print
            </button>
          </div>
        }
      />

      <section className="ui-report-card">
        <header>
          <div>
            <h2>{user?.school_name || "PrimeSchool"}</h2>
            <p className="ui-cell-muted">Official payment receipt</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <b>{data.receipt_number || "—"}</b>
            <p className="ui-cell-muted">{shortDate(data.paid_on)}</p>
          </div>
        </header>

        <div className="ui-definition" style={{ marginTop: 22 }}>
          <div>
            <span>Received from</span>
            <b>{data.student_name}</b>
          </div>
          <div>
            <span>Invoice</span>
            <b>{data.invoice_reference}</b>
          </div>
          <div>
            <span>Method</span>
            <b>{data.method}</b>
          </div>
          <div>
            <span>Reference</span>
            <b>{data.reference || "—"}</b>
          </div>
          <div>
            <span>Amount paid</span>
            <b>{money(data.amount)}</b>
          </div>
        </div>

        <div className="ui-signature-line" style={{ marginTop: 40 }} />
        <p className="ui-cell-muted">Authorised signature</p>
      </section>
    </>
  );
}
