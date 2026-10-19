"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, FormGrid, Notice, PageHeader, Section } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Teacher } from "@/lib/types";

const EMPTY = {
  employee_id: "", full_name: "", email: "", phone: "",
  role: "Teacher", department: "", status: "active", joined_on: "",
};

export default function NewStaffPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof EMPTY) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((previous) => ({ ...previous, [key]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const teacher = await api.post<Teacher>("/teachers/", {
        ...form,
        school: user?.school,
        joined_on: form.joined_on || null,
      });
      router.push(`/staff/${teacher.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.readable : "Could not save this staff member.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <PageHeader
        eyebrow="PEOPLE"
        title="Add a staff member"
        description="Create the staff profile and assign a department."
        action={
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save staff member"}
          </button>
        }
      />
      {error && <Notice>{error}</Notice>}

      <Section title="Personal & contact">
        <FormGrid>
          <Field label="Full name">
            <input value={form.full_name} onChange={set("full_name")} required />
          </Field>
          <Field label="Employee ID">
            <input value={form.employee_id} onChange={set("employee_id")} required />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={set("email")} />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={set("phone")} />
          </Field>
        </FormGrid>
      </Section>

      <Section title="Role">
        <FormGrid>
          <Field label="Role title">
            <input value={form.role} onChange={set("role")} />
          </Field>
          <Field label="Department">
            <input value={form.department} onChange={set("department")} />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={set("status")}>
              <option value="active">Active</option>
              <option value="on_leave">On leave</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
          <Field label="Joined on">
            <input type="date" value={form.joined_on} onChange={set("joined_on")} />
          </Field>
        </FormGrid>
      </Section>
    </form>
  );
}
