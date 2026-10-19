"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Badge, DataTable, Loading, Notice, PageHeader, StatCard } from "@/components/ui";
import { money, shortDate } from "@/lib/format";
import { useList } from "@/lib/useApi";
import type { Invoice } from "@/lib/types";

export default function FeesPage() {
  const router = useRouter();
  const { data, loading, error } = useList<Invoice>("/invoices/");

  const billed = data.reduce((total, invoice) => total + Number(invoice.amount), 0);
  const collected = data.reduce((total, invoice) => total + Number(invoice.paid_total), 0);
  const overdue = data
    .filter((invoice) => invoice.status !== "paid" && new Date(invoice.due_on) < new Date())
    .reduce((total, invoice) => total + Number(invoice.balance), 0);

  return (
    <>
      <PageHeader
        eyebrow="FINANCE"
        title="Fees"
        description="Billing, collections and outstanding balances across the school."
        action={
          <div className="ui-actions">
            <Link href="/fees/structures" className="ui-ghost-button">
              Fee structures
            </Link>
            <Link href="/payments/new" className="primary-button">
              <Plus size={16} />
              Record payment
            </Link>
          </div>
        }
      />

      <div className="metric-strip">
        <StatCard label="Total billed" value={money(billed)} />
        <StatCard label="Collected" value={money(collected)} tone="teal" />
        <StatCard label="Outstanding" value={money(billed - collected)} tone="gold" />
        <StatCard label="Overdue" value={money(overdue)} tone="navy" />
      </div>

      {error && <Notice>{error}</Notice>}
      {loading ? (
        <Loading label="Loading invoices…" />
      ) : (
        <DataTable<Invoice>
          rows={data}
          exportName="invoices"
          searchPlaceholder="Search by student or reference"
          columns={[
            { header: "Invoice", value: (row) => row.reference, cell: (row) => row.reference },
            {
              header: "Student",
              value: (row) => row.student_name ?? "",
              cell: (row) => (
                <Link href={`/fees/student/${row.student}`} className="ui-row-link">
                  {row.student_name}
                </Link>
              ),
            },
            { header: "Billed", value: (row) => row.amount, cell: (row) => money(row.amount) },
            { header: "Paid", value: (row) => row.paid_total, cell: (row) => money(row.paid_total) },
            { header: "Balance", value: (row) => row.balance, cell: (row) => money(row.balance) },
            { header: "Due", value: (row) => row.due_on, cell: (row) => shortDate(row.due_on) },
            { header: "Status", value: (row) => row.status, cell: (row) => <Badge value={row.status} /> },
          ]}
          rowActions={(row) => [
            { label: "View student fee account", onSelect: () => router.push(`/fees/student/${row.student}`) },
            { label: "Record payment", onSelect: () => router.push(`/payments/new?invoice=${row.id}`), disabled: row.status === "paid" },
          ]}
        />
      )}
    </>
  );
}
