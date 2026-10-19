"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge, DataTable, Field, FormGrid, Loading, Modal, Notice, PageHeader, PasswordInput } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { shortDate } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/roles";
import { useList } from "@/lib/useApi";
import type { Account, Role } from "@/lib/types";

const EMPTY = { username: "", email: "", first_name: "", last_name: "", phone: "", role: "teacher", password: "" };
const STAFF_ROLES: Role[] = ["admin", "teacher", "accountant"];

export default function UsersPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useList<Account>("/users/");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [resetting, setResetting] = useState<Account | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof EMPTY) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((previous) => ({ ...previous, [key]: event.target.value }));

  async function create() {
    setBusy(true);
    setFormError("");
    try {
      await api.post("/users/", { ...form, school: user?.school });
      setOpen(false);
      setForm(EMPTY);
      setMessage(`Account created for ${form.username}.`);
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.readable : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!resetting) return;
    setBusy(true);
    setFormError("");
    try {
      await api.post(`/users/${resetting.id}/set-password/`, { password: newPassword });
      setResetting(null);
      setNewPassword("");
      setMessage("Password updated.");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.readable : "Could not update the password.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(account: Account) {
    setMessage("");
    try {
      await api.patch(`/users/${account.id}/`, { is_active: !account.is_active });
      setMessage(account.is_active ? `${account.username} deactivated.` : `${account.username} approved and activated.`);
      reload();
    } catch (err) {
      setMessage("");
      setFormError(err instanceof ApiError ? err.readable : "Could not update the account.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRATION"
        title="User accounts"
        description="Create sign-in accounts and decide what each person can reach."
        action={
          <button
            className="primary-button"
            onClick={() => {
              setFormError("");
              setMessage("");
              setOpen(true);
            }}
          >
            <Plus size={16} />
            Create account
          </button>
        }
      />

      {error && <Notice>{error}</Notice>}
      {formError && <Notice>{formError}</Notice>}
      {message && <Notice kind="success">{message}</Notice>}

      {loading ? (
        <Loading label="Loading accounts…" />
      ) : (
        <DataTable<Account>
          rows={data}
          exportName="user-accounts"
          searchPlaceholder="Search by name, username or email"
          columns={[
            {
              header: "User",
              value: (row) => `${row.first_name} ${row.last_name} ${row.username}`,
              cell: (row) => (
                <span className="ui-cell-strong">
                  {`${row.first_name} ${row.last_name}`.trim() || row.username}
                  <br />
                  <span className="ui-cell-muted">{row.username}</span>
                </span>
              ),
            },
            { header: "Email", value: (row) => row.email, cell: (row) => row.email || "—" },
            { header: "Role", value: (row) => row.role, cell: (row) => ROLE_LABEL[row.role] ?? row.role },
            { header: "Phone", value: (row) => row.phone, cell: (row) => row.phone || "—" },
            { header: "Created", value: (row) => row.date_joined, cell: (row) => shortDate(row.date_joined) },
            {
              header: "Status",
              value: (row) => (row.is_active ? "Active" : "Pending"),
              cell: (row) => <Badge value={row.is_active ? "Active" : "Pending"} />,
            },
          ]}
          rowActions={(row) => [
            { label: row.is_active ? "Deactivate account" : "Approve and activate", onSelect: () => void toggleActive(row), danger: row.is_active },
            { label: "Reset password", onSelect: () => { setFormError(""); setMessage(""); setNewPassword(""); setResetting(row); } },
          ]}
        />
      )}

      {open && (
        <Modal
          title="Create a user account"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className="ui-ghost-button" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="primary-button" onClick={create} disabled={busy}>
                {busy ? "Creating…" : "Create account"}
              </button>
            </>
          }
        >
          {formError && <Notice>{formError}</Notice>}
          <FormGrid>
            <Field label="First name">
              <input value={form.first_name} onChange={set("first_name")} />
            </Field>
            <Field label="Last name">
              <input value={form.last_name} onChange={set("last_name")} />
            </Field>
            <Field label="Username">
              <input value={form.username} onChange={set("username")} required />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={set("email")} />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={set("phone")} />
            </Field>
            <Field label="Role">
              <select value={form.role} onChange={set("role")}>
                {STAFF_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABEL[role]}
                  </option>
                ))}
              </select>
            </Field>
          </FormGrid>
          <Field label="Password" hint="At least 8 characters. Use the eye to check what you typed.">
            <PasswordInput value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
          </Field>
        </Modal>
      )}

      {resetting && (
        <Modal
          title={`Reset password · ${resetting.username}`}
          onClose={() => setResetting(null)}
          footer={
            <>
              <button className="ui-ghost-button" onClick={() => setResetting(null)}>
                Cancel
              </button>
              <button className="primary-button" onClick={resetPassword} disabled={busy}>
                {busy ? "Updating…" : "Update password"}
              </button>
            </>
          }
        >
          {formError && <Notice>{formError}</Notice>}
          <Field label="New password" hint="At least 8 characters.">
            <PasswordInput value={newPassword} onChange={setNewPassword} />
          </Field>
        </Modal>
      )}
    </>
  );
}
