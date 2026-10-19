"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, DataTable, EmptyState, Loading, Notice, Panel, StatCard, Tabs } from "@/components/ui";
import { WEEKDAYS, percent, shortDate } from "@/lib/format";
import { useList, useQuery } from "@/lib/useApi";
import type { Attendance, ClassRoom, Result, Student, TeacherAssignment, TimetableEntry } from "@/lib/types";

const TABS = ["Overview", "Students", "Subjects", "Teachers", "Timetable", "Attendance", "Results"];

export default function ClassDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [tab, setTab] = useState("Overview");
  const { data: room, loading, error } = useQuery<ClassRoom>(`/class-rooms/${params.id}/`);
  const students = useList<Student>("/students/", { classroom: params.id });
  const assignments = useList<TeacherAssignment>("/teacher-assignments/", { classroom: params.id });
  const timetable = useList<TimetableEntry>("/timetable-entries/", { classroom: params.id });
  const attendance = useList<Attendance>("/attendance/", { classroom: params.id });
  const results = useList<Result>("/results/", { classroom: params.id });

  if (loading) return <Loading label="Loading class…" />;
  if (error) return <Notice>{error}</Notice>;
  if (!room) return <EmptyState title="Class not found" />;

  const teachers = Array.from(new Map(assignments.data.map((row) => [row.teacher, row])).values());
  const subjects = Array.from(new Map(assignments.data.map((row) => [row.subject, row])).values());
  const sessions = attendance.data.length;
  const presentCount = attendance.data.filter((row) => row.status === "present" || row.status === "late").length;

  return (
    <>
      <div className="ui-profile-head">
        <span className="ui-avatar">{room.name.slice(0, 2).toUpperCase()}</span>
        <div>
          <h2>{room.name}</h2>
          <p>
            {room.level}
            {room.stream ? ` · Stream ${room.stream}` : ""} · Class teacher: {room.class_teacher_name || "Unassigned"}
          </p>
        </div>
        <div className="ui-profile-actions">
          <Link href="/classes" className="ui-ghost-button">
            Back to classes
          </Link>
        </div>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "Overview" && (
        <div className="metric-strip">
          <StatCard label="Students" value={students.data.length} hint={`Capacity ${room.capacity}`} />
          <StatCard label="Subjects" value={subjects.length} tone="teal" />
          <StatCard label="Teachers" value={teachers.length} tone="gold" />
          <StatCard label="Attendance rate" value={percent(sessions ? Math.round((presentCount / sessions) * 100) : 0)} tone="navy" />
        </div>
      )}

      {tab === "Students" && (
        <DataTable<Student>
          rows={students.data}
          exportName={`${room.name}-students`}
          onRowClick={(row) => router.push(`/students/${row.id}`)}
          columns={[
            { header: "Student", value: (row) => row.full_name, cell: (row) => row.full_name },
            { header: "Admission no.", value: (row) => row.admission_number, cell: (row) => row.admission_number },
            { header: "Guardian", value: (row) => row.parent_name ?? "", cell: (row) => row.parent_name || "—" },
            { header: "Status", value: (row) => row.status, cell: (row) => <Badge value={row.status} /> },
          ]}
        />
      )}

      {tab === "Subjects" && (
        <DataTable<TeacherAssignment>
          rows={subjects}
          searchable={false}
          emptyText="No subjects assigned to this class."
          columns={[
            { header: "Subject", value: (row) => row.subject_name ?? "", cell: (row) => row.subject_name },
            { header: "Teacher", value: (row) => row.teacher_name ?? "", cell: (row) => row.teacher_name },
          ]}
        />
      )}

      {tab === "Teachers" && (
        <DataTable<TeacherAssignment>
          rows={teachers}
          searchable={false}
          emptyText="No teachers assigned yet."
          columns={[
            { header: "Teacher", value: (row) => row.teacher_name ?? "", cell: (row) => row.teacher_name },
            { header: "Subject", value: (row) => row.subject_name ?? "", cell: (row) => row.subject_name },
          ]}
        />
      )}

      {tab === "Timetable" && (
        <DataTable<TimetableEntry>
          rows={timetable.data}
          searchable={false}
          emptyText="No lessons scheduled for this class."
          columns={[
            { header: "Day", value: (row) => WEEKDAYS[row.weekday] ?? "", cell: (row) => WEEKDAYS[row.weekday] },
            { header: "Time", value: (row) => row.starts_at, cell: (row) => `${row.starts_at.slice(0, 5)} – ${row.ends_at.slice(0, 5)}` },
            { header: "Subject", value: (row) => row.subject_name ?? "", cell: (row) => row.subject_name },
            { header: "Teacher", value: (row) => row.teacher_name ?? "", cell: (row) => row.teacher_name },
            { header: "Room", value: (row) => row.room_name ?? "", cell: (row) => row.room_name || "—" },
          ]}
        />
      )}

      {tab === "Attendance" && (
        <Panel title="Recent attendance">
          <DataTable<Attendance>
            rows={attendance.data.slice(0, 200)}
            searchable={false}
            columns={[
              { header: "Date", value: (row) => row.date, cell: (row) => shortDate(row.date) },
              { header: "Student", value: (row) => row.student_name ?? "", cell: (row) => row.student_name },
              { header: "Subject", value: (row) => row.subject_name ?? "", cell: (row) => row.subject_name || "General" },
              { header: "Status", value: (row) => row.status, cell: (row) => <Badge value={row.status} /> },
            ]}
          />
        </Panel>
      )}

      {tab === "Results" && (
        <DataTable<Result>
          rows={results.data}
          exportName={`${room.name}-results`}
          columns={[
            { header: "Student", value: (row) => row.student_name ?? "", cell: (row) => row.student_name },
            { header: "Exam", value: (row) => row.exam_name ?? "", cell: (row) => row.exam_name },
            { header: "Subject", value: (row) => row.subject_name ?? "", cell: (row) => row.subject_name },
            { header: "Total", value: (row) => row.score, cell: (row) => row.score },
            { header: "Grade", value: (row) => row.grade, cell: (row) => <Badge value={row.grade || "—"} /> },
          ]}
        />
      )}
    </>
  );
}
