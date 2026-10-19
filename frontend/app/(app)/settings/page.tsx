"use client";

import { useEffect, useState } from "react";
import { DataTable, Field, FormGrid, Loading, Notice, PageHeader, Panel, Tabs } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/roles";
import { shortDate } from "@/lib/format";
import { useList, useQuery } from "@/lib/useApi";
import type { AcademicYear, GradingScale, School, Term, UserProfileRecord } from "@/lib/types";
import SchoolSetupWorkflow from "../school-setup/page";

const TABS = ["School", "School setup", "Academic", "Users", "System"];

export default function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("School");
  const school = useQuery<School>(user?.school ? `/schools/${user.school}/` : null, undefined, [user?.school]);
  const years = useList<AcademicYear>("/academic-years/");
  const terms = useList<Term>("/terms/");
  const scales = useList<GradingScale>("/grading-scales/");
  const profiles = useList<UserProfileRecord>("/user-profiles/");
  const logs = useList<{ id: number; action: string; entity: string; detail: string; created_at: string }>("/audit-logs/");

  const [form, setForm] = useState({ name: "", code: "", email: "", phone: "", address: "", logo: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (school.data) {
      const { name, code, email, phone, address, logo } = school.data;
      setForm({ name, code, email, phone, address, logo });
    }
  }, [school.data]);

  async function saveSchool() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.patch(`/schools/${user?.school}/`, form);
      setMessage("School profile updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.readable : "Could not save the school profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="ADMINISTRATION" title="Settings" description="School profile, academic calendar, users and system records." />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {error && <Notice>{error}</Notice>}
      {message && <Notice kind="success">{message}</Notice>}

      {tab === "School" &&
        (school.loading ? (
          <Loading />
        ) : (
          <Panel
            title="School profile"
            action={
              <button className="primary-button" onClick={saveSchool} disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </button>
            }
          >
            <FormGrid>
              <Field label="School name">
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </Field>
              <Field label="School code">
                <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
              </Field>
              <Field label="Email">
                <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </Field>
              <Field label="Logo URL">
                <input value={form.logo} onChange={(event) => setForm({ ...form, logo: event.target.value })} />
              </Field>
              <Field label="Address">
                <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
              </Field>
            </FormGrid>
          </Panel>
        ))}

      {tab === "Academic" && (
        <>
          <Panel title="Academic years">
            <DataTable<AcademicYear>
              rows={years.data}
              searchable={false}
              columns={[
                { header: "Year", value: (row) => row.name, cell: (row) => row.name },
                { header: "Starts", value: (row) => row.starts_on, cell: (row) => shortDate(row.starts_on) },
                { header: "Ends", value: (row) => row.ends_on, cell: (row) => shortDate(row.ends_on) },
                { header: "Current", value: (row) => String(row.is_current), cell: (row) => (row.is_current ? "Yes" : "No") },
              ]}
            />
          </Panel>
          <Panel title="Terms">
            <DataTable<Term>
              rows={terms.data}
              searchable={false}
              columns={[
                { header: "Term", value: (row) => row.name, cell: (row) => row.name },
                { header: "Year", value: (row) => row.academic_year_name ?? "", cell: (row) => row.academic_year_name },
                { header: "Starts", value: (row) => row.starts_on, cell: (row) => shortDate(row.starts_on) },
                { header: "Ends", value: (row) => row.ends_on, cell: (row) => shortDate(row.ends_on) },
              ]}
            />
          </Panel>
          <Panel title="Grading scales">
            {scales.data.map((scale) => (
              <div key={scale.id} style={{ marginBottom: 14 }}>
                <b>{scale.name}</b>
                {scale.is_default && <span className="ui-badge" style={{ marginLeft: 8 }}>Default</span>}
                <p className="ui-cell-muted">
                  {scale.bands.map((band) => `${band.grade}: ${band.min_score}–${band.max_score}`).join(" · ")}
                </p>
              </div>
            ))}
          </Panel>
        </>
      )}

      {tab === "School setup" && <SchoolSetupWorkflow />}

      {tab === "Users" && (
        <DataTable<UserProfileRecord>
          rows={profiles.data}
          searchable={false}
          emptyText="No user accounts yet."
          columns={[
            { header: "User ID", value: (row) => row.user, cell: (row) => row.user },
            { header: "Role", value: (row) => row.role, cell: (row) => ROLE_LABEL[row.role] ?? row.role },
            { header: "Phone", value: (row) => row.phone, cell: (row) => row.phone || "—" },
          ]}
        />
      )}

      {tab === "System" && (
        <Panel title="Audit log">
          <DataTable
            rows={logs.data}
            searchable={false}
            emptyText="No activity recorded yet."
            columns={[
              { header: "When", value: (row) => row.created_at, cell: (row) => shortDate(row.created_at) },
              { header: "Action", value: (row) => row.action, cell: (row) => row.action },
              { header: "Entity", value: (row) => row.entity, cell: (row) => row.entity },
              { header: "Detail", value: (row) => row.detail, cell: (row) => row.detail || "—" },
            ]}
          />
        </Panel>
      )}
    </>
  );
}
