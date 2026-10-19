"use client";

import Link from "next/link";
import { Badge, DataTable, EmptyState, Loading, Notice, PageHeader, Panel, StatCard } from "@/components/ui";
import { money, shortDate } from "@/lib/format";
import { useList, useQuery } from "@/lib/useApi";
import type { Invoice, Payment, Student } from "@/lib/types";

export default function StudentFeesPage({ params }: { params: { id: string } }) {
  const student = useQuery<Student>(`/students/${params.id}/`);
  const invoices = useList<Invoice>("/invoices/", { student: params.id });
  const payments = useList<Payment>("/payments/", { student: params.id });

  if (student.loading) return <Loading label="Loading fee ledger…" />;
  if (student.error) return <Notice>{student.error}</Notice>;
  if (!student.data) return <EmptyState title="Student not found" />;

  const billed = invoices.data.reduce((total, invoice) => total + Number(invoice.amount), 0);
  const paid = invoices.data.reduce((total, invoice) => total + Number(invoice.paid_total), 0);

  return (
    <>
      <PageHeader
        eyebrow="FINANCE"
        title={`Fee ledger · ${student.data.full_name}`}
        description={`${student.data.admission_number} · ${student.data.current_class || "Unassigned"}`}
        action={
          <div className="ui-actions">
            <Link href={`/students/${params.id}`} className="ui-ghost-button">
              Student profile
            </Link>
            <Link href="/payments/new" className="primary-button">
              Record payment
            </Link>
          </div>
        }
      />

      <div className="metric-strip">
        <StatCard label="Total fee" value={money(billed)} />
        <StatCard label="Paid" value={money(paid)} tone="teal" />
        <StatCard label="Balance" value={money(billed - paid)} tone="gold" />
      </div>

      <Panel title="Invoices">
        <DataTable<Invoice>
          rows={invoices.data}
          searchable={false}
          columns={[
            { header: "Reference", value: (row) => row.reference, cell: (row) => row.reference },
            { header: "Billed", value: (row) => row.amount, cell: (row) => money(row.amount) },
            { header: "Paid", value: (row) => row.paid_total, cell: (row) => money(row.paid_total) },
            { header: "Balance", value: (row) => row.balance, cell: (row) => money(row.balance) },
            { header: "Due", value: (row) => row.due_on, cell: (row) => shortDate(row.due_on) },
            { header: "Status", value: (row) => row.status, cell: (row) => <Badge value={row.status} /> },
          ]}
        />
      </Panel>

      <Panel title="Payment history">
        <DataTable<Payment>
          rows={payments.data}
          searchable={false}
          columns={[
            { header: "Date", value: (row) => row.paid_on, cell: (row) => shortDate(row.paid_on) },
            { header: "Invoice", value: (row) => row.invoice_reference ?? "", cell: (row) => row.invoice_reference },
            { header: "Method", value: (row) => row.method, cell: (row) => row.method },
            { header: "Reference", value: (row) => row.reference, cell: (row) => row.reference || "—" },
            { header: "Amount", value: (row) => row.amount, cell: (row) => money(row.amount) },
            {
              header: "Receipt",
              cell: (row) => (
                <Link href={`/payments/${row.id}/receipt`} className="ui-row-link">
                  {row.receipt_number || "View"}
                </Link>
              ),
            },
          ]}
        />
      </Panel>
    </>
  );
}
