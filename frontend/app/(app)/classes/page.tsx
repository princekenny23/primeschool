"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { EmptyState, Field, FormGrid, Loading, Modal, Notice, PageHeader } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useApi";
import type { ClassRoom, Teacher } from "@/lib/types";

export default function ClassesPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useList<ClassRoom>("/class-rooms/");
  const teachers = useList<Teacher>("/teachers/");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", level: "", stream: "", capacity: "40", class_teacher: "" });
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((previous) => ({ ...previous, [key]: event.target.value }));

  async function save() {
    setBusy(true);
    setFormError("");
    try {
      await api.post("/class-rooms/", {
        school: user?.school,
        name: form.name,
        level: form.level,
        stream: form.stream,
        capacity: Number(form.capacity) || 40,
        class_teacher: form.class_teacher ? Number(form.class_teacher) : null,
      });
      setOpen(false);
      setForm({ name: "", level: "", stream: "", capacity: "40", class_teacher: "" });
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.readable : "Could not create the class.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="ACADEMICS"
        title="Classes"
        description="Year groups and streams, their learners, subjects and teachers."
        action={
          <button className="primary-button" onClick={() => setOpen(true)}>
            <Plus size={16} />
            Add class
          </button>
        }
      />
      {error && <Notice>{error}</Notice>}
      {loading ? (
        <Loading label="Loading classes…" />
      ) : data.length ? (
        <div className="ui-card-grid">
          {data.map((room) => (
            <Link key={room.id} href={`/classes/${room.id}`} className="ui-card">
              <h4>{room.name}</h4>
              <p>
                {room.level}
                {room.stream ? ` · Stream ${room.stream}` : ""}
              </p>
              <div className="ui-card-meta">
                <span>{room.student_count ?? 0} students</span>
                <span>{room.subject_count ?? 0} subjects</span>
              </div>
              <p style={{ marginTop: 10 }}>{room.class_teacher_name || "No class teacher"}</p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="No classes yet" description="Create your first class to start enrolling students." />
      )}

      {open && (
        <Modal
          title="Add a class"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className="ui-ghost-button" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="primary-button" onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Create class"}
              </button>
            </>
          }
        >
          {formError && <Notice>{formError}</Notice>}
          <FormGrid>
            <Field label="Class name" hint="For example Form 2A">
              <input value={form.name} onChange={set("name")} />
            </Field>
            <Field label="Level">
              <input value={form.level} onChange={set("level")} />
            </Field>
            <Field label="Stream">
              <input value={form.stream} onChange={set("stream")} />
            </Field>
            <Field label="Capacity">
              <input type="number" value={form.capacity} onChange={set("capacity")} />
            </Field>
            <Field label="Class teacher">
              <select value={form.class_teacher} onChange={set("class_teacher")}>
                <option value="">Unassigned</option>
                {teachers.data.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.full_name}
                  </option>
                ))}
              </select>
            </Field>
          </FormGrid>
        </Modal>
      )}
    </>
  );
}
