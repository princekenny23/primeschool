"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState, Field, Loading, Notice, PageHeader, Panel, Pagination } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useList, useQuery } from "@/lib/useApi";
import type { ClassRoom, Exam, MarksRow, Subject } from "@/lib/types";

type Component = "assignment_score" | "midterm_score" | "final_score";

export default function MarksEntryPage({ params }: { params: { id: string } }) {
  const exam = useQuery<Exam>(`/exams/${params.id}/`);
  const classes = useList<ClassRoom>("/class-rooms/");
  const subjects = useList<Subject>("/subjects/");

  const [classroom, setClassroom] = useState("");
  const [subject, setSubject] = useState("");
  const [rows, setRows] = useState<MarksRow[]>([]);
  const [page, setPage] = useState(1);
  const [maxMarks, setMaxMarks] = useState(100);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!classroom && classes.data.length) setClassroom(String(classes.data[0].id));
    if (!subject && subjects.data.length) setSubject(String(subjects.data[0].id));
  }, [classes.data, subjects.data, classroom, subject]);

  useEffect(() => {
    if (!classroom || !subject) return;
    setLoading(true);
    setError("");
    setMessage("");
    api
      .get<{ max_marks: number; rows: MarksRow[] }>("/results/sheet/", { exam: params.id, classroom, subject })
      .then((data) => {
        setRows(data.rows);
        setPage(1);
        setMaxMarks(Number(data.max_marks));
      })
      .catch((err: ApiError) => setError(err.readable))
      .finally(() => setLoading(false));
  }, [params.id, classroom, subject]);

  const update = (student: number, field: Component, value: string) =>
    setRows((previous) => previous.map((row) => (row.student === student ? { ...row, [field]: value === "" ? null : Number(value) } : row)));

  const totalOf = (row: MarksRow) =>
    Number(row.assignment_score ?? 0) + Number(row.midterm_score ?? 0) + Number(row.final_score ?? 0);

  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const saved = await api.post<MarksRow[]>("/results/bulk/", {
        exam: Number(params.id),
        subject: Number(subject),
        records: rows.map((row) => ({
          student: row.student,
          assignment_score: row.assignment_score,
          midterm_score: row.midterm_score,
          final_score: row.final_score,
          comment: row.comment,
        })),
      });
      setRows((previous) =>
        previous.map((row) => {
          const match = saved.find((item) => item.student === row.student);
          return match ? { ...row, score: match.score, grade: match.grade } : row;
        })
      );
      setMessage(`Marks saved for ${rows.length} learners.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.readable : "Could not save marks.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="ACADEMICS"
        title={exam.data ? `Marks · ${exam.data.name}` : "Marks entry"}
        description={`Totals and grades are calculated automatically. Maximum marks: ${maxMarks}.`}
        action={
          <div className="ui-actions">
            <Link href="/exams" className="ui-ghost-button">
              Back to exams
            </Link>
            <button className="primary-button" onClick={save} disabled={busy || !rows.length}>
              {busy ? "Saving…" : "Save marks"}
            </button>
          </div>
        }
      />

      <div className="ui-filter-bar">
        <Field label="Class">
          <select value={classroom} onChange={(event) => setClassroom(event.target.value)}>
            {classes.data.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Subject">
          <select value={subject} onChange={(event) => setSubject(event.target.value)}>
            {subjects.data.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {error && <Notice>{error}</Notice>}
      {message && <Notice kind="success">{message}</Notice>}

      <Panel title={`Marks sheet · ${rows.length} learners`}>
        {loading ? (
          <Loading label="Loading the marks sheet…" />
        ) : rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Assignment</th>
                  <th>Midterm</th>
                  <th>Final</th>
                  <th>Total</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice((page - 1) * 10, page * 10).map((row) => {
                  const total = totalOf(row);
                  return (
                    <tr key={row.student}>
                      <td>
                        <span className="ui-cell-strong">{row.student_name}</span>
                        <br />
                        <span className="ui-cell-muted">{row.admission_number}</span>
                      </td>
                      {(["assignment_score", "midterm_score", "final_score"] as Component[]).map((field) => (
                        <td key={field}>
                          <input
                            className="ui-input"
                            type="number"
                            min={0}
                            max={maxMarks}
                            style={{ width: 90 }}
                            value={row[field] ?? ""}
                            onChange={(event) => update(row.student, field, event.target.value)}
                          />
                        </td>
                      ))}
                      <td className={total > maxMarks ? "ui-over-limit" : "ui-cell-strong"}>{total}</td>
                      <td>{row.grade || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No learners in this class" />
        )}
        {!loading && rows.length > 0 && <div className="ui-table-foot"><Pagination currentPage={Math.min(page, Math.max(1, Math.ceil(rows.length / 10)))} totalItems={rows.length} onPageChange={setPage} /></div>}
      </Panel>
    </>
  );
}
