"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { EmptyState, Field, FormGrid, Loading, Modal, Notice, PageHeader, Pagination, Tabs } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { WEEKDAYS } from "@/lib/format";
import { useList } from "@/lib/useApi";
import type { ClassRoom, Room, Subject, Teacher, TimetableEntry } from "@/lib/types";

const TABS = ["Class timetable", "Teacher timetable", "Room timetable"];

export default function TimetablePage() {
  const [tab, setTab] = useState(TABS[0]);
  const classes = useList<ClassRoom>("/class-rooms/");
  const teachers = useList<Teacher>("/teachers/");
  const subjects = useList<Subject>("/subjects/");
  const rooms = useList<Room>("/rooms/");
  const entries = useList<TimetableEntry>("/timetable-entries/");

  const [scopeId, setScopeId] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ classroom: "", subject: "", teacher: "", room_ref: "", weekday: "0", starts_at: "08:00", ends_at: "09:00" });
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const scopeField = tab === TABS[0] ? "classroom" : tab === TABS[1] ? "teacher" : "room_ref";
  const scopeOptions = tab === TABS[0] ? classes.data : tab === TABS[1] ? teachers.data : rooms.data;
  const optionLabel = (option: ClassRoom | Teacher | Room) => ("full_name" in option ? option.full_name : option.name);

  const visible = entries.data.filter((entry) => {
    if (!scopeId) return true;
    if (scopeField === "classroom") return entry.classroom === Number(scopeId);
    if (scopeField === "teacher") return entry.teacher === Number(scopeId);
    return entry.room_ref === Number(scopeId);
  });
  const slots = Array.from(new Set(visible.map((entry) => entry.starts_at.slice(0, 5)))).sort();
  const timetablePage = Math.min(page, Math.max(1, Math.ceil(slots.length / 10)));

  const entryAt = (weekday: number, slot: string) =>
    visible.find((entry) => entry.weekday === weekday && entry.starts_at.slice(0, 5) === slot);

  async function checkConflicts() {
    const response = await api.get<{ conflicts: string[] }>("/timetable-entries/check-conflict/", {
      weekday: form.weekday,
      starts_at: form.starts_at,
      ends_at: form.ends_at,
      teacher: form.teacher,
      classroom: form.classroom,
      room_ref: form.room_ref,
    });
    setConflicts(response.conflicts);
    return response.conflicts.length === 0;
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      if (!(await checkConflicts())) return;
      await api.post("/timetable-entries/", {
        classroom: Number(form.classroom),
        subject: Number(form.subject),
        teacher: Number(form.teacher),
        room_ref: form.room_ref ? Number(form.room_ref) : null,
        weekday: Number(form.weekday),
        starts_at: form.starts_at,
        ends_at: form.ends_at,
      });
      setOpen(false);
      setConflicts([]);
      entries.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.readable : "Could not save the lesson.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="ACADEMICS"
        title="Timetable"
        description="Class, teacher and room schedules with automatic conflict checks."
        action={
          <button className="primary-button" onClick={() => setOpen(true)}>
            <Plus size={16} />
            Add lesson
          </button>
        }
      />

      <Tabs
        tabs={TABS}
        active={tab}
        onChange={(next) => {
          setTab(next);
          setScopeId("");
          setPage(1);
        }}
      />

      <div className="ui-filter-bar">
        <Field label="Showing">
          <select value={scopeId} onChange={(event) => { setScopeId(event.target.value); setPage(1); }}>
            <option value="">Everything</option>
            {scopeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {optionLabel(option)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {entries.error && <Notice>{entries.error}</Notice>}
      {entries.loading ? (
        <Loading label="Loading the timetable…" />
      ) : visible.length ? (
        <>
          <div className="table-wrap">
            <table className="ui-timetable">
            <thead>
              <tr>
                <th>Time</th>
                {WEEKDAYS.slice(0, 5).map((day) => (
                  <th key={day}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.slice((timetablePage - 1) * 10, timetablePage * 10).map((slot) => (
                <tr key={slot}>
                  <th>{slot}</th>
                  {WEEKDAYS.slice(0, 5).map((day, weekday) => {
                    const entry = entryAt(weekday, slot);
                    return (
                      <td key={day}>
                        {entry ? (
                          <span className="ui-slot">
                            <b>{entry.subject_name}</b>
                            <small>
                              {entry.classroom_name} · {entry.teacher_name}
                              {entry.room_name ? ` · ${entry.room_name}` : ""}
                            </small>
                          </span>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            </table>
          </div>
          <div className="ui-table-foot"><Pagination currentPage={timetablePage} totalItems={slots.length} onPageChange={setPage} /></div>
        </>
      ) : (
        <EmptyState title="No lessons scheduled" description="Add a lesson to start building the timetable." />
      )}

      {open && (
        <Modal
          title="Add a lesson"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className="ui-ghost-button" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="primary-button" onClick={save} disabled={busy}>
                {busy ? "Checking…" : "Save lesson"}
              </button>
            </>
          }
        >
          {error && <Notice>{error}</Notice>}
          {conflicts.map((conflict) => (
            <Notice key={conflict}>{conflict}</Notice>
          ))}
          <FormGrid>
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
            <Field label="Subject">
              <select value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })}>
                <option value="">Select subject</option>
                {subjects.data.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Teacher">
              <select value={form.teacher} onChange={(event) => setForm({ ...form, teacher: event.target.value })}>
                <option value="">Select teacher</option>
                {teachers.data.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.full_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Room">
              <select value={form.room_ref} onChange={(event) => setForm({ ...form, room_ref: event.target.value })}>
                <option value="">No room</option>
                {rooms.data.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Day">
              <select value={form.weekday} onChange={(event) => setForm({ ...form, weekday: event.target.value })}>
                {WEEKDAYS.slice(0, 5).map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Starts at">
              <input type="time" value={form.starts_at} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} />
            </Field>
            <Field label="Ends at">
              <input type="time" value={form.ends_at} onChange={(event) => setForm({ ...form, ends_at: event.target.value })} />
            </Field>
          </FormGrid>
        </Modal>
      )}
    </>
  );
}
