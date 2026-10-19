"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Download,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Field, FormGrid, Loading, Modal, Notice, PageHeader, Pagination } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useList } from "@/lib/useApi";
import type { School } from "@/lib/types";

type SchoolStatus = "draft" | "active" | "paused" | "archived";

const EMPTY_FORM = {
  name: "",
  code: "",
  email: "",
  phone: "",
  address: "",
  logo: "",
};

const EMPTY_ADMIN_FORM = {
  username: "",
  full_name: "",
  email: "",
  phone: "",
  role: "School Administrator",
  password: "",
  confirm_password: "",
  send_welcome_email: true,
};

const STATUS_META: Record<SchoolStatus, { label: string; dotClass: string; chipClass: string }> = {
  active: { label: "Active", dotClass: "status-dot success", chipClass: "status-pill success" },
  draft: { label: "Draft", dotClass: "status-dot warning", chipClass: "status-pill warning" },
  paused: { label: "Paused", dotClass: "status-dot neutral", chipClass: "status-pill neutral" },
  archived: { label: "Archived", dotClass: "status-dot muted", chipClass: "status-pill muted" },
};

export default function SchoolsPage() {
  const router = useRouter();
  const schools = useList<School>("/schools/");
  const [summary, setSummary] = useState({
    total_schools: 0,
    active_schools: 0,
    draft_schools: 0,
    paused_schools: 0,
    archived_schools: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingSchoolId, setEditingSchoolId] = useState<number | null>(null);
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | SchoolStatus>("all");
  const [sortBy, setSortBy] = useState("newest");
  const [form, setForm] = useState(EMPTY_FORM);
  const [adminForm, setAdminForm] = useState(EMPTY_ADMIN_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [openActionId, setOpenActionId] = useState<number | null>(null);

  useEffect(() => {
    if (!schools.data.length && !schools.loading) {
      setSummaryLoading(false);
      return;
    }

    setSummaryLoading(true);
    api
      .get<{ total_schools: number; active_schools: number; draft_schools: number; paused_schools: number; archived_schools: number }>("/schools/summary/")
      .then((payload) => {
        setSummary(payload);
      })
      .catch(() => undefined)
      .finally(() => setSummaryLoading(false));
  }, [schools.data.length, schools.loading]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredSchools = useMemo(() => {
    const query = search.trim().toLowerCase();
    const next = [...schools.data].filter((school) => {
      const matchesSearch = !query || [school.name, school.code, school.address].join(" ").toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || (school.status ?? "active") === statusFilter;
      return matchesSearch && matchesStatus;
    });

    next.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "code") return a.code.localeCompare(b.code);
      if (sortBy === "status") return String(a.status ?? "active").localeCompare(String(b.status ?? "active"));
      return Number(b.id) - Number(a.id);
    });

    return next;
  }, [schools.data, search, sortBy, statusFilter]);
  const schoolPageSize = 10;
  const schoolPage = Math.min(page, Math.max(1, Math.ceil(filteredSchools.length / schoolPageSize)));
  const visibleSchools = filteredSchools.slice((schoolPage - 1) * schoolPageSize, schoolPage * schoolPageSize);

  function openCreateSchool() {
    setEditingSchoolId(null);
    setShowCreate(true);
    setStep(1);
    setFormErrors({});
    setForm(EMPTY_FORM);
    setAdminForm(EMPTY_ADMIN_FORM);
  }

  function closeCreateSchool() {
    setShowCreate(false);
    setStep(1);
    setFormErrors({});
    setEditingSchoolId(null);
  }

  function openEditSchool(school: School) {
    setEditingSchoolId(school.id);
    setForm({ name: school.name, code: school.code, email: school.email, phone: school.phone, address: school.address, logo: school.logo });
    setFormErrors({});
    setStep(1);
    setShowCreate(true);
  }

  function validateStep1() {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "School name is required.";
    if (!form.code.trim()) errors.code = "School code is required.";
    if (!form.address.trim()) errors.address = "School address is required.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateStep2() {
    const errors: Record<string, string> = {};
    if (!adminForm.username.trim()) errors.username = "Username is required.";
    if (!adminForm.full_name.trim()) errors.full_name = "Administrator name is required.";
    if (!adminForm.email.trim()) errors.email = "Administrator email is required.";
    if (!adminForm.password) errors.password = "Password is required.";
    if (adminForm.password && adminForm.password.length < 8) errors.password = "Password must have at least 8 characters.";
    if (adminForm.password !== adminForm.confirm_password) errors.confirm_password = "Passwords do not match.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreateSchool() {
    setBusy(true);
    setError("");
    try {
      const school = await api.post<School>("/schools/", {
        name: form.name,
        code: form.code,
        email: form.email,
        phone: form.phone,
        address: form.address,
        logo: form.logo,
      });
      const nameParts = adminForm.full_name.trim().split(/\s+/);
      await api.post("/users/", {
        username: adminForm.username.trim(),
        email: adminForm.email,
        first_name: nameParts.shift() || "School",
        last_name: nameParts.join(" "),
        password: adminForm.password,
        phone: adminForm.phone,
        role: "admin",
        school: school.id,
        is_active: true,
      });
      setToast("School created successfully");
      setBusy(false);
      schools.reload();
      closeCreateSchool();
    } catch (err) {
      setBusy(false);
      setError(err instanceof ApiError ? err.readable : "Could not create school.");
    }
  }

  async function handleUpdateSchool() {
    if (!editingSchoolId) return;
    setBusy(true);
    setError("");
    try {
      await api.patch(`/schools/${editingSchoolId}/`, form);
      setToast("School details updated successfully");
      schools.reload();
      closeCreateSchool();
    } catch (err) {
      setError(err instanceof ApiError ? err.readable : "Could not update school.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusChange(schoolId: number, nextStatus: SchoolStatus) {
    try {
      await api.post(`/schools/${schoolId}/set-status/`, { status: nextStatus });
      setToast("School status updated");
      schools.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.readable : "Could not update school status.");
    }
  }

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, logo: String(reader.result ?? "") }));
    reader.readAsDataURL(file);
  }

  const loadingSummaryCards = summaryLoading || schools.loading;

  return (
    <div className="saas-page-shell">
      <PageHeader
        eyebrow="PLATFORM"
        title="Schools"
        description="Manage and monitor all schools registered on your PrimeSchool platform."
        action={
          <button className="primary-button" onClick={openCreateSchool}>
            <Plus size={16} />
            Create School
          </button>
        }
      />

      {error && (
        <Notice kind="error">
          <div className="notice-inline">
            <span>{error}</span>
            <button className="ui-ghost-button" onClick={() => schools.reload()}>
              <RefreshCcw size={14} />
              Retry
            </button>
          </div>
        </Notice>
      )}

      {toast && <Notice kind="success">{toast}</Notice>}

      <section className="stats-grid">
        {loadingSummaryCards ? (
          <>
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="stat-card skeleton-card">
                <div className="skeleton-line short" />
                <div className="skeleton-line medium" />
                <div className="skeleton-line tiny" />
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-icon neutral"><Building2 size={16} /></span>
                <span className="stat-label">Total Schools</span>
              </div>
              <div className="stat-value">{summary.total_schools}</div>
              <div className="stat-hint">All registered schools</div>
            </div>

            <div className="stat-card success">
              <div className="stat-card-header">
                <span className="stat-icon success"><CheckCircle2 size={16} /></span>
                <span className="stat-label">Active</span>
              </div>
              <div className="stat-value">{summary.active_schools}</div>
              <div className="stat-hint">Currently using PrimeSchool</div>
            </div>

            <div className="stat-card warning">
              <div className="stat-card-header">
                <span className="stat-icon warning"><AlertCircle size={16} /></span>
                <span className="stat-label">Draft</span>
              </div>
              <div className="stat-value">{summary.draft_schools}</div>
              <div className="stat-hint">Awaiting setup</div>
            </div>

            <div className="stat-card neutral">
              <div className="stat-card-header">
                <span className="stat-icon neutral"><ShieldCheck size={16} /></span>
                <span className="stat-label">Paused</span>
              </div>
              <div className="stat-value">{summary.paused_schools}</div>
              <div className="stat-hint">Temporarily unavailable</div>
            </div>
          </>
        )}
      </section>

      <section className="panel-card">
        <div className="panel-header-row">
          <div>
            <h3>Registered Schools</h3>
            <p>View, search and manage schools on your platform.</p>
          </div>
        </div>

        <div className="toolbar-shell">
          {schools.loading ? (
            <div className="toolbar-skeleton">
              <div className="skeleton-line search-skeleton" />
              <div className="skeleton-line filter-skeleton" />
              <div className="skeleton-line action-skeleton" />
              <div className="skeleton-line action-skeleton" />
            </div>
          ) : (
            <>
              <label className="search-field">
                <Search size={15} />
                <input
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                  placeholder="Search schools by name or code..."
                />
              </label>

              <div className="toolbar-controls">
                <label className="select-field">
                  <span>Status</span>
                  <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as "all" | SchoolStatus); setPage(1); }}>
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="paused">Paused</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>

                <label className="select-field">
                  <span>Sort</span>
                  <select value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(1); }}>
                    <option value="newest">Newest</option>
                    <option value="name">Name</option>
                    <option value="code">Code</option>
                    <option value="status">Status</option>
                  </select>
                </label>

                <button className="ui-ghost-button" onClick={() => schools.reload()}>
                  <RefreshCcw size={14} />
                  Refresh
                </button>

                <button className="ui-ghost-button" type="button">
                  <Download size={14} />
                  Export
                </button>
              </div>
            </>
          )}
        </div>

        {schools.loading ? (
          <div className="table-skeleton">
            {[1, 2, 3, 4].map((line) => (
              <div key={line} className="skeleton-row">
                <div className="skeleton-line medium" />
                <div className="skeleton-line small" />
                <div className="skeleton-line small" />
                <div className="skeleton-line medium" />
                <div className="skeleton-line medium" />
                <div className="skeleton-line small" />
                <div className="skeleton-line small" />
                <div className="skeleton-line small" />
              </div>
            ))}
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="empty-state-panel">
            <div className="empty-state-graphic">
              <Building2 size={32} />
            </div>
            {schools.data.length === 0 ? (
              <>
                <h4>No schools registered yet</h4>
                <p>
                  Create your first school to start managing students, teachers, academics and school operations from PrimeSchool.
                </p>
                <button className="primary-button" onClick={openCreateSchool}>
                  <Plus size={16} />
                  Create School
                </button>
              </>
            ) : (
              <>
                <h4>No schools found</h4>
                <p>Try changing your search or filter.</p>
                <button
                  className="ui-ghost-button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setPage(1);
                  }}
                >
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="school-table">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Code</th>
                  <th>Status</th>
                  <th>Administrator</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Students</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleSchools.map((school) => {
                  const status = (school.status ?? "active") as SchoolStatus;
                  const meta = STATUS_META[status] ?? STATUS_META.active;
                  return (
                    <tr key={school.id}>
                      <td>
                        <div className="school-cell">
                          <div className="school-avatar">
                            {(school.name || "PS").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="school-meta">
                            <span className="school-name">{school.name}</span>
                            <small>{school.address || "Location not provided"}</small>
                          </div>
                        </div>
                      </td>
                      <td>{school.code}</td>
                      <td>
                        <div className={meta.chipClass}>
                          <span className={meta.dotClass} />
                          {meta.label}
                        </div>
                      </td>
                      <td>
                        <div className="admin-cell">
                          <span className="admin-name">Platform Admin</span>
                          <small>Primary owner</small>
                        </div>
                      </td>
                      <td>{school.email || "—"}</td>
                      <td>{school.phone || "—"}</td>
                      <td>0</td>
                      <td>{new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td>
                        <div className="menu-button-wrap">
                          <button
                            className="menu-button"
                            aria-label="Open school actions"
                            aria-expanded={openActionId === school.id}
                            title="School actions"
                            onClick={() => setOpenActionId((current) => current === school.id ? null : school.id)}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          <div className="menu-panel" role="menu">
                            <button type="button" onClick={() => { openEditSchool(school); setOpenActionId(null); }}>Edit school details</button>
                            <button type="button" onClick={() => { router.push(`/school-setup?school=${school.id}`); setOpenActionId(null); }}>Set up school</button>
                            <button type="button" onClick={() => { handleStatusChange(school.id, status === "paused" ? "active" : "paused"); setOpenActionId(null); }}>
                              {status === "paused" ? "Activate School" : "Pause School"}
                            </button>
                            <button type="button" className="danger-menu-item" onClick={() => { handleStatusChange(school.id, "archived"); setOpenActionId(null); }}>
                              Archive School
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!schools.loading && filteredSchools.length > 0 && (
          <div className="ui-table-foot">
            <Pagination currentPage={schoolPage} totalItems={filteredSchools.length} pageSize={schoolPageSize} onPageChange={setPage} />
          </div>
        )}
      </section>

      {showCreate && (
        <Modal
          title={editingSchoolId ? "Edit School Details" : "Create School"}
          onClose={closeCreateSchool}
          footer={
            <>
              <button className="ui-ghost-button" onClick={closeCreateSchool}>
                Cancel
              </button>
              {step > 1 && (
                <button className="ui-ghost-button" onClick={() => setStep((current) => Math.max(1, current - 1))}>
                  <ArrowLeft size={14} />
                  Back
                </button>
              )}
              {editingSchoolId ? (
                <button className="primary-button" onClick={handleUpdateSchool} disabled={busy}>
                  {busy ? "Saving..." : "Save changes"}
                </button>
              ) : step < 3 ? (
                <button
                  className="primary-button"
                  onClick={() => {
                    const valid = step === 1 ? validateStep1() : validateStep2();
                    if (valid) setStep((current) => current + 1);
                  }}
                >
                  Continue
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button className="primary-button" onClick={handleCreateSchool} disabled={busy}>
                  {busy ? "Creating..." : "Create School"}
                </button>
              )}
            </>
          }
        >
          <div className="modal-stepper">
            {[1, 2, 3].map((value) => (
              <div key={value} className={`step-bullet ${step === value ? "active" : step > value ? "done" : ""}`}>
                {value}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="create-school-step">
              <h4>School Information</h4>
              <FormGrid>
                <Field label="School logo">
                  <input type="file" accept="image/*" onChange={handleLogoChange} />
                </Field>

                <Field label="School name *">
                  <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                  {formErrors.name && <small className="inline-error">{formErrors.name}</small>}
                </Field>

                <Field label="School code *">
                  <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
                  {formErrors.code && <small className="inline-error">{formErrors.code}</small>}
                </Field>

                <Field label="Email">
                  <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                </Field>

                <Field label="Phone">
                  <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                </Field>

                <Field label="Address *">
                  <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
                  {formErrors.address && <small className="inline-error">{formErrors.address}</small>}
                </Field>
              </FormGrid>
            </div>
          )}

          {step === 2 && (
            <div className="create-school-step">
              <h4>Administrator</h4>
              <FormGrid>
                <Field label="Login username *">
                  <input value={adminForm.username} onChange={(event) => setAdminForm({ ...adminForm, username: event.target.value })} />
                  {formErrors.username && <small className="inline-error">{formErrors.username}</small>}
                </Field>
                <Field label="Full name *">
                  <input value={adminForm.full_name} onChange={(event) => setAdminForm({ ...adminForm, full_name: event.target.value })} />
                  {formErrors.full_name && <small className="inline-error">{formErrors.full_name}</small>}
                </Field>

                <Field label="Email *">
                  <input type="email" value={adminForm.email} onChange={(event) => setAdminForm({ ...adminForm, email: event.target.value })} />
                  {formErrors.email && <small className="inline-error">{formErrors.email}</small>}
                </Field>

                <Field label="Phone">
                  <input value={adminForm.phone} onChange={(event) => setAdminForm({ ...adminForm, phone: event.target.value })} />
                </Field>

                <Field label="Role">
                  <select value={adminForm.role} onChange={(event) => setAdminForm({ ...adminForm, role: event.target.value })}>
                    <option>School Administrator</option>
                    <option>Academic Director</option>
                    <option>Operations Manager</option>
                    <option>Finance Manager</option>
                  </select>
                </Field>

                <Field label="Password *">
                  <input type="password" value={adminForm.password} onChange={(event) => setAdminForm({ ...adminForm, password: event.target.value })} />
                  {formErrors.password && <small className="inline-error">{formErrors.password}</small>}
                </Field>

                <Field label="Confirm password *">
                  <input type="password" value={adminForm.confirm_password} onChange={(event) => setAdminForm({ ...adminForm, confirm_password: event.target.value })} />
                  {formErrors.confirm_password && <small className="inline-error">{formErrors.confirm_password}</small>}
                </Field>

                <Field label="Send welcome email">
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={adminForm.send_welcome_email}
                      onChange={(event) => setAdminForm({ ...adminForm, send_welcome_email: event.target.checked })}
                    />
                    <span>Send welcome email to the administrator</span>
                  </label>
                </Field>
              </FormGrid>
            </div>
          )}

          {step === 3 && (
            <div className="create-school-step">
              <h4>Review</h4>
              <div className="review-grid">
                <div className="review-card">
                  <span>School</span>
                  <strong>{form.name || "—"}</strong>
                  <small>{form.code || "—"}</small>
                  <small>{form.address || "—"}</small>
                </div>
                <div className="review-card">
                  <span>Administrator</span>
                  <strong>{adminForm.full_name || "—"}</strong>
                  <small>{adminForm.email || "—"}</small>
                  <small>{adminForm.role || "—"}</small>
                </div>
                <div className="review-card">
                  <span>Contact</span>
                  <strong>{form.phone || "—"}</strong>
                  <small>{form.email || "—"}</small>
                  <small>{adminForm.phone || "—"}</small>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
