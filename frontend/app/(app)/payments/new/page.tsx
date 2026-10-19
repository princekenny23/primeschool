"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Field, FormGrid, Notice, PageHeader, Section } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { money } from "@/lib/format";
import { useList } from "@/lib/useApi";
import type { Invoice, Payment } from "@/lib/types";

export default function NewPaymentPage() {
  const router = useRouter();
  const invoices = useList<Invoice>("/invoices/");
  const [form, setForm] = useState({ invoice: "", amount: "", method: "cash", reference: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = invoices.data.find((invoice) => invoice.id === Number(form.invoice));

  useEffect(() => {
    const invoice = new URLSearchParams(window.location.search).get("invoice");
    if (invoice) setForm((current) => ({ ...current, invoice }));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payment = await api.post<Payment>("/payments/", {
        invoice: Number(form.invoice),
        amount: Number(form.amount),
        method: form.method,
        reference: form.reference,
      });
      router.push(`/payments/${payment.id}/receipt`);
    } catch (err) {
      setError(err instanceof ApiError ? err.readable : "Could not record the payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <PageHeader
        eyebrow="FINANCE"
        title="Record a payment"
        description="Post a payment against an invoice and issue a receipt."
        action={
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Record payment"}
          </button>
        }
      />
      {error && <Notice>{error}</Notice>}

      <Section title="Payment">
        <FormGrid>
          <Field label="Invoice" hint={selected ? `Balance ${money(selected.balance)}` : "Choose the invoice being settled"}>
            <select value={form.invoice} onChange={(event) => setForm({ ...form, invoice: event.target.value })} required>
              <option value="">Select invoice</option>
              {invoices.data
                .filter((invoice) => invoice.status !== "paid")
                .map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.reference} · {invoice.student_name} · {money(invoice.balance)}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Amount">
            <input type="number" min={1} step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required />
          </Field>
          <Field label="Method">
            <select value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })}>
              <option value="cash">Cash</option>
              <option value="bank">Bank transfer</option>
              <option value="mobile money">Mobile money</option>
              <option value="cheque">Cheque</option>
            </select>
          </Field>
          <Field label="Reference">
            <input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} />
          </Field>
        </FormGrid>
      </Section>
    </form>
  );
}
