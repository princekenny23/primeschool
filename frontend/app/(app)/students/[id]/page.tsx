"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, DataTable, EmptyState, Loading, Notice, PageHeader, Panel, StatCard, Tabs } from "@/components/ui";
import { WEEKDAYS, initials, money, percent, shortDate } from "@/lib/format";
import { useList, useQuery } from "@/lib/useApi";
import type { Attendance, Enrollment, Invoice, Payment, Result, Student, TimetableEntry } from "@/lib/types";

const TABS = ["Overview", "Attendance", "Results", "Fees", "Timetable", "History"];

export default function StudentProfilePage({ params }: { params: { id: string } }) {
  const [tab, setTab] = useState("Overview");
  const { data: student, loading, error } = useQuery<Student>(`/students/${params.id}/`);

  const attendance = useList<Attendance>("/attendance/", { student: params.id });
  const results = useList<Result>("/results/", { student: params.id });
  const invoices = useList<Invoice>("/invoices/", { student: params.id });
  const payments = useList<Payment>("/payments/", { student: params.id });
  const enrollments = useList<Enrollment>("/enrollments/", { student: params.id });
  const timetable = useList<TimetableEntry>(
    student?.current_class_id ? "/timetable-entries/" : null,
    { classroom: student?.current_class_id },
    [student?.current_class_id]
  );

  if (loading) return <Loading label="Loading student…" />;
  if (error) return <Notice>{error}</Notice>;
  if (!student) return <EmptyState title="Student not found" />;

  const sessions = attendance.data.length;
  const present = attendance.data.filter((row) => row.status === "present").length;
  const late = attendance.data.filter((row) => row.status === "late").length;
  const absent = attendance.data.filter((row) => row.status === "absent").length;
  const rate = sessions ? Math.round(((present + late) / sessions) * 100) : 0;

  const billed = invoices.data.reduce((total, invoice) => total + Number(invoice.amount), 0);
  const paid = invoices.data.reduce((total, invoice) => total + Number(invoice.paid_total), 0);

  return (
    <>
      <div className="ui-profile-head">
        <span className="ui-avatar">{initials(student.full_name)}</span>
        <div>
          <h2>{student.full_name}</h2>
          <p>
            {student.admission_number} · {student.current_class || "Unassigned"} · <Badge value={student.status} />
          </p>
        </div>
        <div className="ui-profile-actions">
          <Link href="/students" className="ui-ghost-button">
            Back to list
          </Link>
        </div>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "Overview" && (
        <div className="ui-grid ui-grid-2">
          <Panel title="Student information">
            <div className="ui-definition">
              <div>
                <span>Date of birth</span>
                <b>{shortDate(student.date_of_birth)}</b>
              </div>
              <div>
                <span>Gender</span>
                <b>{student.gender || "—"}</b>
              </div>
              <div>
                <span>Phone</span>
                <b>{student.phone || "—"}</b>
              </div>
              <div>
                <span>Email</span>
                <b>{student.email || "—"}</b>
              </div>
              <div>
                <span>Address</span>
                <b>{student.address || "—"}</b>
              </div>
              <div>
                <span>Admitted</span>
                <b>{shortDate(student.joined_on)}</b>
              </div>
            </div>
          </Panel>
          <Panel title="Guardian & placement">
            <div className="ui-definition">
              <div>
                <span>Guardian</span>
                <b>{student.parent_name || "—"}</b>
              </div>
              <div>
                <span>Current class</span>
                <b>{student.current_class || "Unassigned"}</b>
              </div>
              <div>
                <span>Attendance rate</span>
                <b>{percent(rate)}</b>
              </div>
              <div>
                <span>Fee balance</span>
                <b>{money(billed - paid)}</b>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {tab === "Attendance" && (
        <>
          <div className="metric-strip">
            <StatCard label="Present" value={present} />
            <StatCard label="Absent" value={absent} tone="gold" />
            <StatCard label="Late" value={late} tone="teal" />
            <StatCard label="Attendance rate" value={percent(rate)} tone="navy" />
          </div>
          <DataTable<Attendance>
            rows={attendance.data}
            exportName={`attendance-${student.admission_number}`}
            columns={[
              { header: "Date", value: (row) => row.date, cell: (row) => shortDate(row.date) },
              { header: "Class", value: (row) => row.classroom_name ?? "", cell: (row) => row.classroom_name },
              { header: "Subject", value: (row) => row.subject_name ?? "", cell: (row) => row.subject_name || "General" },
              { header: "Status", value: (row) => row.status, cell: (row) => <Badge value={row.status} /> },
              { header: "Note", value: (row) => row.note, cell: (row) => row.note || "—" },
            ]}
          />
        </>
      )}

      {tab === "Results" && (
        <DataTable<Result>
          rows={results.data}
          exportName={`results-${student.admission_number}`}
          columns={[
            { header: "Exam", value: (row) => row.exam_name ?? "", cell: (row) => row.exam_name },
            { header: "Subject", value: (row) => row.subject_name ?? "", cell: (row) => row.subject_name },
            { header: "Assignment", value: (row) => row.assignment_score ?? "", cell: (row) => row.assignment_score ?? "—" },
            { header: "Midterm", value: (row) => row.midterm_score ?? "", cell: (row) => row.midterm_score ?? "—" },
            { header: "Final", value: (row) => row.final_score ?? "", cell: (row) => row.final_score ?? "—" },
            { header: "Total", value: (row) => row.score, cell: (row) => row.score },
            { header: "Grade", value: (row) => row.grade, cell: (row) => <Badge value={row.grade || "—"} /> },
          ]}
        />
      )}

      {tab === "Fees" && (
        <>
          <div className="metric-strip">
            <StatCard label="Total billed" value={money(billed)} />
            <StatCard label="Paid" value={money(paid)} tone="teal" />
            <StatCard label="Balance" value={money(billed - paid)} tone="gold" />
          </div>
          <Panel title="Invoices" action={<Link href={`/fees/student/${student.id}`} className="ui-row-link">Open ledger</Link>}>
            <DataTable<Invoice>
              rows={invoices.data}
              searchable={false}
              columns={[
                { header: "Reference", value: (row) => row.reference, cell: (row) => row.reference },
                { header: "Amount", value: (row) => row.amount, cell: (row) => money(row.amount) },
                { header: "Paid", value: (row) => row.paid_total, cell: (row) => money(row.paid_total) },
                { header: "Balance", value: (row) => row.balance, cell: (row) => money(row.balance) },
                { header: "Due", value: (row) => row.due_on, cell: (row) => shortDate(row.due_on) },
                { header: "Status", value: (row) => row.status, cell: (row) => <Badge value={row.status} /> },
              ]}
            />
          </Panel>
          <Panel title="Payment history">
            <DataTable<Payment>
              rows={payments.data}
              searchable={false}
              columns={[
                { header: "Date", value: (row) => row.paid_on, cell: (row) => shortDate(row.paid_on) },
                { header: "Receipt", value: (row) => row.receipt_number ?? "", cell: (row) => row.receipt_number || "—" },
                { header: "Method", value: (row) => row.method, cell: (row) => row.method },
                { header: "Amount", value: (row) => row.amount, cell: (row) => money(row.amount) },
              ]}
            />
          </Panel>
        </>
      )}

      {tab === "Timetable" && (
        <DataTable<TimetableEntry>
          rows={timetable.data}
          searchable={false}
          emptyText="No timetable for this class yet."
          columns={[
            { header: "Day", value: (row) => WEEKDAYS[row.weekday] ?? "", cell: (row) => WEEKDAYS[row.weekday] },
            { header: "Time", value: (row) => row.starts_at, cell: (row) => `${row.starts_at.slice(0, 5)} – ${row.ends_at.slice(0, 5)}` },
            { header: "Subject", value: (row) => row.subject_name ?? "", cell: (row) => row.subject_name },
            { header: "Teacher", value: (row) => row.teacher_name ?? "", cell: (row) => row.teacher_name },
            { header: "Room", value: (row) => row.room_name ?? "", cell: (row) => row.room_name || "—" },
          ]}
        />
      )}

      {tab === "History" && (
        <DataTable<Enrollment>
          rows={enrollments.data}
          searchable={false}
          emptyText="No enrolment history recorded."
          columns={[
            { header: "Academic year", value: (row) => row.academic_year_name ?? "", cell: (row) => row.academic_year_name },
            { header: "Class", value: (row) => row.classroom_name ?? "", cell: (row) => row.classroom_name },
            { header: "Enrolled on", value: (row) => row.enrolled_on, cell: (row) => shortDate(row.enrolled_on) },
          ]}
        />
      )}
    </>
  );
}
