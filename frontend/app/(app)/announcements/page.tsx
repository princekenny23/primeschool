"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge, DataTable, Field, Loading, Modal, Notice, PageHeader } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { shortDate } from "@/lib/format";
import { useList } from "@/lib/useApi";
import type { Announcement, ClassRoom } from "@/lib/types";

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useList<Announcement>("/announcements/");
  const classes = useList<ClassRoom>("/class-rooms/");
  const canPublish = user?.role === "admin";
  const [actionError, setActionError] = useState("");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", audience: "everyone", classroom: "" });
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function togglePublish(item: Announcement) {
    try {
      await api.patch(`/announcements/${item.id}/`, { is_published: !item.is_published });
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.readable : "Could not update the announcement.");
    }
  }

  async function save(publish: boolean) {
    setBusy(true);
    setFormError("");
    try {
      await api.post("/announcements/", {
        school: user?.school,
        title: form.title,
        body: form.body,
        audience: form.audience,
        classroom: form.audience === "class" && form.classroom ? Number(form.classroom) : null,
        is_published: publish,
      });
      setOpen(false);
      setForm({ title: "", body: "", audience: "everyone", classroom: "" });
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.readable : "Could not save the announcement.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="COMMUNICATION"
        title="Announcements"
        description="Notices for the whole school or a specific audience."
        action={
          canPublish ? (
            <button className="primary-button" onClick={() => setOpen(true)}>
              <Plus size={16} />
              New announcement
            </button>
          ) : undefined
        }
      />
      {error && <Notice>{error}</Notice>}
      {actionError && <Notice>{actionError}</Notice>}
      {loading ? (
        <Loading label="Loading announcements…" />
      ) : (
        <DataTable<Announcement>
          rows={data}
          exportName="announcements"
          columns={[
            {
              header: "Announcement",
              value: (row) => row.title,
              cell: (row) => (
                <span>
                  <span className="ui-cell-strong">{row.title}</span>
                  <br />
                  <span className="ui-cell-muted">{row.body.slice(0, 90)}</span>
                </span>
              ),
            },
            {
              header: "Audience",
              value: (row) => row.audience,
              cell: (row) => (row.audience === "class" ? row.classroom_name || "Class" : row.audience),
            },
            { header: "Published", value: (row) => row.published_at, cell: (row) => shortDate(row.published_at) },
            { header: "Author", value: (row) => row.author ?? "", cell: (row) => row.author || "—" },
            {
              header: "Status",
              value: (row) => (row.is_published ? "Published" : "Draft"),
              cell: (row) => <Badge value={row.is_published ? "Published" : "Draft"} />,
            },
          ]}
          rowActions={canPublish ? (row) => [{ label: row.is_published ? "Unpublish" : "Publish", onSelect: () => void togglePublish(row) }] : undefined}
        />
      )}

      {open && (
        <Modal
          title="New announcement"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className="ui-ghost-button" onClick={() => save(false)} disabled={busy}>
                Save draft
              </button>
              <button className="primary-button" onClick={() => save(true)} disabled={busy}>
                {busy ? "Saving…" : "Publish"}
              </button>
            </>
          }
        >
          {formError && <Notice>{formError}</Notice>}
          <Field label="Title">
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </Field>
          <Field label="Message">
            <textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} />
          </Field>
          <Field label="Audience">
            <select value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })}>
              <option value="everyone">Everyone</option>
              <option value="teachers">Teachers</option>
              <option value="students">Students</option>
              <option value="parents">Parents</option>
              <option value="class">Specific class</option>
            </select>
          </Field>
          {form.audience === "class" && (
            <Field label="Class">
              <select value={form.classroom} onChange={(event) => setForm({ ...form, classroom: event.target.value })}>
                <option value="">Select class</option>
                {classes.data.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </Modal>
      )}
    </>
  );
}
