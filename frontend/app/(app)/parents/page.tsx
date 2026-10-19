"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { DataTable, Field, FormGrid, Loading, Modal, Notice, PageHeader } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useApi";
import type { Parent } from "@/lib/types";

export default function ParentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, loading, error, reload } = useList<Parent>("/parents/");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", relationship: "Guardian", phone: "", email: "", address: "" });
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setFormError("");
    try {
      await api.post("/parents/", { ...form, school: user?.school });
      setOpen(false);
      setForm({ full_name: "", relationship: "Guardian", phone: "", email: "", address: "" });
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.readable : "Could not save this guardian.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="PEOPLE"
        title="Parents & guardians"
        description="Families linked to learners, and how to reach them."
        action={
          <button className="primary-button" onClick={() => setOpen(true)}>
            <Plus size={16} />
            Add guardian
          </button>
        }
      />
      {error && <Notice>{error}</Notice>}
      {loading ? (
        <Loading label="Loading guardians…" />
      ) : (
        <DataTable<Parent>
          rows={data}
          exportName="guardians"
          columns={[
            { header: "Guardian", value: (row) => row.full_name, cell: (row) => <span className="ui-cell-strong">{row.full_name}</span> },
            { header: "Relationship", value: (row) => row.relationship, cell: (row) => row.relationship || "—" },
            {
              header: "Children",
              value: (row) => (row.children ?? []).map((child) => child.full_name).join(", "),
              cell: (row) =>
                row.children?.length ? (
                  <span>
                    {row.children.map((child) => (
                      <Link key={child.id} href={`/students/${child.id}`} className="ui-row-link" style={{ marginRight: 10 }}>
                        {child.full_name}
                      </Link>
                    ))}
                  </span>
                ) : (
                  "—"
                ),
            },
            { header: "Phone", value: (row) => row.phone, cell: (row) => row.phone || "—" },
            { header: "Email", value: (row) => row.email, cell: (row) => row.email || "—" },
          ]}
          rowActions={(row) => [
            ...(row.phone ? [{ label: "Call guardian", onSelect: () => { window.location.href = `tel:${row.phone}`; } }] : []),
            ...(row.email ? [{ label: "Email guardian", onSelect: () => { window.location.href = `mailto:${row.email}`; } }] : []),
            ...(row.children?.length ? [{ label: "View linked learner", onSelect: () => router.push(`/students/${row.children![0].id}`) }] : []),
          ]}
        />
      )}

      {open && (
        <Modal
          title="Add a guardian"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className="ui-ghost-button" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="primary-button" onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save guardian"}
              </button>
            </>
          }
        >
          {formError && <Notice>{formError}</Notice>}
          <FormGrid>
            <Field label="Full name">
              <input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
            </Field>
            <Field label="Relationship">
              <input value={form.relationship} onChange={(event) => setForm({ ...form, relationship: event.target.value })} />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </Field>
            <Field label="Address">
              <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
            </Field>
          </FormGrid>
        </Modal>
      )}
    </>
  );
}
