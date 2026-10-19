"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { EmptyState, Field, Loading, Notice, PageHeader, Panel, StatCard } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { today } from "@/lib/format";
import { useList } from "@/lib/useApi";
import type { AttendanceSheetRow, AttendanceStatus, ClassRoom, Subject } from "@/lib/types";

const STATUSES: AttendanceStatus[] = ["present", "absent", "late", "excused"];

export default function AttendancePage() {
  const classes = useList<ClassRoom>("/class-rooms/");
  const subjects = useList<Subject>("/subjects/");

  const [classroom, setClassroom] = useState("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState<AttendanceSheetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!classes.data.length || classroom) return;
    setClassroom(String(classes.data[0].id));
  }, [classes.data, classroom]);

  useEffect(() => {
    if (!classroom) return;
    setLoading(true);
    setError("");
    setMessage("");
    api
      .get<{ rows: AttendanceSheetRow[] }>("/attendance/sheet/", { classroom, date, subject })
      .then((data) => setRows(data.rows))
      .catch((err: ApiError) => setError(err.readable))
      .finally(() => setLoading(false));
  }, [classroom, date, subject]);

  const mark = (student: number, status: AttendanceStatus) =>
    setRows((previous) => previous.map((row) => (row.student === student ? { ...row, status } : row)));

  const markAll = () => setRows((previous) => previous.map((row) => ({ ...row, status: "present" as AttendanceStatus })));
  const markedRows = rows.filter((row) => row.status !== "");
  const unmarked = rows.length - markedRows.length;

  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.post("/attendance/bulk/", {
        classroom: Number(classroom),
        subject: subject ? Number(subject) : null,
        date,
        records: markedRows.map((row) => ({ student: row.student, status: row.status, note: row.note })),
      });
      setMessage(`Attendance saved for ${markedRows.length} learners. ${unmarked ? `${unmarked} remain unmarked.` : ""}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.readable : "Could not save attendance.");
    } finally {
      setBusy(false);
    }
  }

  const counts = STATUSES.map((status) => rows.filter((row) => row.status === status).length);

  return (
    <>
      <PageHeader
        eyebrow="DAILY OPERATIONS"
        title="Attendance"
        description="Pick a class, date and subject, then record who is in the room."
        action={
          <button className="primary-button" onClick={save} disabled={busy || !markedRows.length}>
            <Check size={16} />
            {busy ? "Saving…" : "Save attendance"}
          </button>
        }
      />

      <div className="ui-filter-bar">
        <Field label="Date">
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
        <Field label="Class">
          <select value={classroom} onChange={(event) => setClassroom(event.target.value)}>
            {classes.data.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Subject" hint="Leave blank for a general daily register">
          <select value={subject} onChange={(event) => setSubject(event.target.value)}>
            <option value="">General register</option>
            {subjects.data.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <button className="ui-ghost-button" onClick={markAll} disabled={!rows.length}>
          Mark all present
        </button>
      </div>

      {error && <Notice>{error}</Notice>}
      {message && <Notice kind="success">{message}</Notice>}

      <div className="metric-strip">
        {STATUSES.map((status, index) => (
          <StatCard key={status} label={status} value={counts[index]} tone={index === 1 ? "gold" : index === 2 ? "teal" : ""} />
        ))}
        <StatCard label="Unmarked" value={unmarked} tone="navy" />
      </div>

      <Panel title={`Register · ${rows.length} learners`}>
        {loading ? (
          <Loading label="Loading the register…" />
        ) : rows.length ? (
          rows.map((row) => (
            <div className="ui-attendance-row" key={row.student}>
              <b>
                {row.student_name}
                <br />
                <span className="ui-cell-muted">{row.admission_number}</span>
                {!row.status && <><br /><span className="ui-cell-muted">Not marked</span></>}
              </b>
              <div className="ui-choice">
                {STATUSES.map((status) => (
                  <button key={status} className={row.status === status ? `on-${status}` : ""} onClick={() => mark(row.student, status)}>
                    {status}
                  </button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <EmptyState title="No learners enrolled in this class" description="Enrol students first, then take attendance." />
        )}
      </Panel>
    </>
  );
}
