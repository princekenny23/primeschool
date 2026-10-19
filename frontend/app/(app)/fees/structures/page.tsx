"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { DataTable, Field, FormGrid, Loading, Modal, Notice, PageHeader } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { useList } from "@/lib/useApi";
import type { AcademicYear, ClassRoom, FeeItem, FeeStructure, Term } from "@/lib/types";

export default function FeeStructuresPage() {
  const { user } = useAuth();
  const structures = useList<FeeStructure>("/fee-structures/");
  const years = useList<AcademicYear>("/academic-years/");
  const terms = useList<Term>("/terms/");
  const classes = useList<ClassRoom>("/class-rooms/");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", academic_year: "", term: "", classroom: "" });
  const [items, setItems] = useState<FeeItem[]>([{ name: "Tuition", amount: 0 }]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  async function save() {
    setBusy(true);
    setError("");
    try {
      await api.post("/fee-structures/", {
        school: user?.school,
        name: form.name,
        academic_year: Number(form.academic_year),
        term: form.term ? Number(form.term) : null,
        classroom: form.classroom ? Number(form.classroom) : null,
        amount: total,
        items: items.filter((item) => item.name).map((item) => ({ name: item.name, amount: Number(item.amount || 0) })),
      });
      setOpen(false);
      setForm({ name: "", academic_year: "", term: "", classroom: "" });
      setItems([{ name: "Tuition", amount: 0 }]);
      structures.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.readable : "Could not save the fee structure.");
    } finally {
      setBusy(false);
    }
  }

  async function generateInvoices(structure: FeeStructure) {
    if (!structure.classroom) {
      setError("Attach a class to this structure before generating invoices.");
      return;
    }
    try {
      const result = await api.post<{ created: number }>("/invoices/generate/", { fee_structure: structure.id, classroom: structure.classroom });
      setError("");
      setMessage(`${result.created} invoice${result.created === 1 ? "" : "s"} generated.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.readable : "Could not generate invoices.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="FINANCE"
        title="Fee structures"
        description="Itemised fees per class and term, and the invoices generated from them."
        action={
          <button className="primary-button" onClick={() => setOpen(true)}>
            <Plus size={16} />
            New structure
          </button>
        }
      />
      {error && <Notice>{error}</Notice>}
      {message && <Notice kind="success">{message}</Notice>}
      {structures.loading ? (
        <Loading label="Loading fee structures…" />
      ) : (
        <DataTable<FeeStructure>
          rows={structures.data}
          exportName="fee-structures"
          columns={[
            { header: "Structure", value: (row) => row.name, cell: (row) => <span className="ui-cell-strong">{row.name}</span> },
            { header: "Class", value: (row) => row.classroom_name ?? "", cell: (row) => row.classroom_name || "All classes" },
            { header: "Term", value: (row) => row.term_name ?? "", cell: (row) => row.term_name || "—" },
            {
              header: "Items",
              value: (row) => row.items.map((item) => `${item.name} ${item.amount}`).join(" · "),
              cell: (row) => row.items.map((item) => `${item.name} ${money(item.amount)}`).join(" · ") || "—",
            },
            { header: "Total", value: (row) => row.total, cell: (row) => <b>{money(row.total)}</b> },
          ]}
          rowActions={(row) => [{ label: "Generate invoices", onSelect: () => void generateInvoices(row) }]}
        />
      )}

      {open && (
        <Modal
          title="New fee structure"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className="ui-ghost-button" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="primary-button" onClick={save} disabled={busy}>
                {busy ? "Saving…" : `Save · ${money(total)}`}
              </button>
            </>
          }
        >
          <FormGrid>
            <Field label="Name">
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </Field>
            <Field label="Academic year">
              <select value={form.academic_year} onChange={(event) => setForm({ ...form, academic_year: event.target.value })}>
                <option value="">Select year</option>
                {years.data.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Term">
              <select value={form.term} onChange={(event) => setForm({ ...form, term: event.target.value })}>
                <option value="">All terms</option>
                {terms.data.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Class">
              <select value={form.classroom} onChange={(event) => setForm({ ...form, classroom: event.target.value })}>
                <option value="">All classes</option>
                {classes.data.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </Field>
          </FormGrid>

          <span className="section-kicker">FEE ITEMS</span>
          {items.map((item, index) => (
            <div className="ui-actions" key={index} style={{ marginTop: 10 }}>
              <input
                className="ui-input"
                placeholder="Item name"
                value={item.name}
                onChange={(event) =>
                  setItems(items.map((entry, position) => (position === index ? { ...entry, name: event.target.value } : entry)))
                }
              />
              <input
                className="ui-input"
                type="number"
                placeholder="Amount"
                value={item.amount}
                onChange={(event) =>
                  setItems(items.map((entry, position) => (position === index ? { ...entry, amount: event.target.value } : entry)))
                }
              />
              <button className="ui-danger-button" onClick={() => setItems(items.filter((_, position) => position !== index))}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button className="ui-ghost-button" style={{ marginTop: 12 }} onClick={() => setItems([...items, { name: "", amount: 0 }])}>
            <Plus size={14} />
            Add item
          </button>
        </Modal>
      )}
    </>
  );
}
