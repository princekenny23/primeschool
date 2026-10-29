"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge, DataTable, Field, FormGrid, Loading, Modal, Notice, PageHeader } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useApi";
import type { ClassRoom, Subject, Teacher, TeacherAssignment } from "@/lib/types";

export default function SubjectsPage() {
  const { user } = useAuth();
  const subjects = useList<Subject>("/subjects/");
  const assignments = useList<TeacherAssignment>("/teacher-assignments/");
  const teachers = useList<Teacher>("/teachers/");
  const classes = useList<ClassRoom>("/class-rooms/");

  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", department: "" });
  const [assignment, setAssignment] = useState({ subject: "", teacher: "", classroom: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function createSubject() {
    setBusy(true);
    setError("");
    try {
      await api.post("/subjects/", { ...form, school: user?.school, is_active: true });
      setOpen(false);
      setForm({ name: "", code: "", department: "" });
      subjects.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.readable : "Could not create the subject.");
    } finally {
      setBusy(false);
    }
  }

  async function createAssignment() {
    if (!assignment.subject || !assignment.teacher || !assignment.classroom) {
      setError("Select a subject, teacher, and class before assigning.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await api.post("/teacher-assignments/", {
        subject: Number(assignment.subject),
        teacher: Number(assignment.teacher),
        classroom: Number(assignment.classroom),
      });
      setAssignOpen(false);
      setAssignment({ subject: "", teacher: "", classroom: "" });
      assignments.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.readable : "Could not create the assignment.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleSubject(subject: Subject) {
    try {
      await api.patch(`/subjects/${subject.id}/`, { is_active: !subject.is_active });
      subjects.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.readable : "Could not update the subject.");
    }
  }

  const classesFor = (subjectId: number) =>
    Array.from(new Set(assignments.data.filter((row) => row.subject === subjectId).map((row) => row.classroom_name))).join(", ");
  const teachersFor = (subjectId: number) =>
    Array.from(new Set(assignments.data.filter((row) => row.subject === subjectId).map((row) => row.teacher_name))).join(", ");

  return (
    <>
      <PageHeader
        eyebrow="ACADEMICS"
        title="Subjects"
        description="The subject catalogue and who teaches it in each class."
        action={
          <div className="ui-actions">
            <button className="ui-ghost-button" onClick={() => setAssignOpen(true)}>
              Assign teacher
            </button>
            <button className="primary-button" onClick={() => setOpen(true)}>
              <Plus size={16} />
              Add subject
            </button>
          </div>
        }
      />
      {subjects.error && <Notice>{subjects.error}</Notice>}
      {error && <Notice>{error}</Notice>}
      {subjects.loading ? (
        <Loading label="Loading subjects…" />
      ) : (
        <DataTable<Subject>
          rows={subjects.data}
          exportName="subjects"
          columns={[
            { header: "Subject", value: (row) => row.name, cell: (row) => <span className="ui-cell-strong">{row.name}</span> },
            { header: "Code", value: (row) => row.code, cell: (row) => row.code },
            { header: "Department", value: (row) => row.department, cell: (row) => row.department || "—" },
            { header: "Classes", value: (row) => classesFor(row.id), cell: (row) => classesFor(row.id) || "—" },
            { header: "Teachers", value: (row) => teachersFor(row.id), cell: (row) => teachersFor(row.id) || "—" },
            { header: "Status", value: (row) => (row.is_active ? "Active" : "Inactive"), cell: (row) => <Badge value={row.is_active ? "Active" : "Inactive"} /> },
          ]}
          rowActions={(row) => [
            { label: "Assign teacher", onSelect: () => { setAssignment({ subject: String(row.id), teacher: "", classroom: "" }); setAssignOpen(true); } },
            { label: row.is_active ? "Deactivate subject" : "Reactivate subject", onSelect: () => void toggleSubject(row), danger: row.is_active },
          ]}
        />
      )}

      {open && (
        <Modal
          title="Add a subject"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className="ui-ghost-button" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="primary-button" onClick={createSubject} disabled={busy}>
                {busy ? "Saving…" : "Create subject"}
              </button>
            </>
          }
        >
          {error && <Notice>{error}</Notice>}
          <FormGrid>
            <Field label="Subject name">
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </Field>
            <Field label="Subject code">
              <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
            </Field>
            <Field label="Department">
              <input value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} />
            </Field>
          </FormGrid>
        </Modal>
      )}

      {assignOpen && (
        <Modal
          title="Assign a teacher"
          onClose={() => setAssignOpen(false)}
          footer={
            <>
              <button className="ui-ghost-button" onClick={() => setAssignOpen(false)}>
                Cancel
              </button>
              <button className="primary-button" onClick={createAssignment} disabled={busy}>
                {busy ? "Saving…" : "Assign"}
              </button>
            </>
          }
        >
          {error && <Notice>{error}</Notice>}
          <FormGrid>
            <Field label="Subject">
              <select required value={assignment.subject} onChange={(event) => setAssignment({ ...assignment, subject: event.target.value })}>
                <option value="">Select subject</option>
                {subjects.data.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Teacher">
              <select required value={assignment.teacher} onChange={(event) => setAssignment({ ...assignment, teacher: event.target.value })}>
                <option value="">Select teacher</option>
                {teachers.data.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.full_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Class">
              <select required value={assignment.classroom} onChange={(event) => setAssignment({ ...assignment, classroom: event.target.value })}>
                <option value="">Select class</option>
                {classes.data.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
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
