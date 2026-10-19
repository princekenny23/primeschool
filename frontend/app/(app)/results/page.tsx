"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, DataTable, Field, Loading, Notice, PageHeader } from "@/components/ui";
import { useList } from "@/lib/useApi";
import type { ClassRoom, Exam, Result, Subject } from "@/lib/types";

export default function ResultsPage() {
  const router = useRouter();
  const exams = useList<Exam>("/exams/");
  const classes = useList<ClassRoom>("/class-rooms/");
  const subjects = useList<Subject>("/subjects/");

  const [exam, setExam] = useState("");
  const [classroom, setClassroom] = useState("");
  const [subject, setSubject] = useState("");
  const { data, loading, error } = useList<Result>("/results/", { exam, classroom, subject });

  return (
    <>
      <PageHeader
        eyebrow="ACADEMICS"
        title="Results"
        description="Filter marks by exam, class and subject, then open a learner's report card."
      />

      <div className="ui-filter-bar">
        <Field label="Exam">
          <select value={exam} onChange={(event) => setExam(event.target.value)}>
            <option value="">All exams</option>
            {exams.data.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Class">
          <select value={classroom} onChange={(event) => setClassroom(event.target.value)}>
            <option value="">All classes</option>
            {classes.data.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Subject">
          <select value={subject} onChange={(event) => setSubject(event.target.value)}>
            <option value="">All subjects</option>
            {subjects.data.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {error && <Notice>{error}</Notice>}
      {loading ? (
        <Loading label="Loading results…" />
      ) : (
        <DataTable<Result>
          rows={data}
          exportName="results"
          searchPlaceholder="Search by student or subject"
          columns={[
            { header: "Student", value: (row) => row.student_name ?? "", cell: (row) => <span className="ui-cell-strong">{row.student_name}</span> },
            { header: "Exam", value: (row) => row.exam_name ?? "", cell: (row) => row.exam_name },
            { header: "Subject", value: (row) => row.subject_name ?? "", cell: (row) => row.subject_name },
            { header: "Total", value: (row) => row.score, cell: (row) => row.score },
            { header: "Grade", value: (row) => row.grade, cell: (row) => <Badge value={row.grade || "—"} /> },
          ]}
          rowActions={(row) => [{
            label: "Open report card",
            onSelect: () => router.push(`/results/${row.student}/report-card?exam=${row.exam}`),
            disabled: !row.exam,
          }]}
        />
      )}
    </>
  );
}
