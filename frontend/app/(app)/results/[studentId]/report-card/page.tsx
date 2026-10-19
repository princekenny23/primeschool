"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Printer } from "lucide-react";
import { EmptyState, Loading, Notice, PageHeader, Pagination } from "@/components/ui";
import { percent, shortDate } from "@/lib/format";
import { useQuery } from "@/lib/useApi";
import type { ReportCard } from "@/lib/types";

export default function ReportCardPage({ params }: { params: { studentId: string } }) {
  const [page, setPage] = useState(1);
  const search = useSearchParams();
  const exam = search.get("exam");
  const { data, loading, error } = useQuery<ReportCard>(exam ? "/results/report-card/" : null, {
    student: params.studentId,
    exam,
  });

  if (!exam) return <EmptyState title="Choose an exam" description="Open a report card from the results page." />;
  if (loading) return <Loading label="Building the report card…" />;
  if (error) return <Notice>{error}</Notice>;
  if (!data) return <EmptyState title="No report card available" />;

  return (
    <>
      <PageHeader
        eyebrow="ACADEMICS"
        title="Report card"
        description={`${data.student.full_name} · ${data.exam.name}`}
        action={
          <button className="primary-button" onClick={() => window.print()}>
            <Printer size={16} />
            Print
          </button>
        }
      />

      <section className="ui-report-card">
        <header>
          <div>
            <h2>{data.student.full_name}</h2>
            <p className="ui-cell-muted">
              {data.student.admission_number} · {data.classroom?.name ?? "Unassigned"}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <b>{data.exam.name}</b>
            <p className="ui-cell-muted">
              {shortDate(data.exam.starts_on)} – {shortDate(data.exam.ends_on)}
            </p>
          </div>
        </header>

        <div className="table-wrap" style={{ margin: "20px 0" }}>
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Assignment</th>
                <th>Midterm</th>
                <th>Final</th>
                <th>Total</th>
                <th>Grade</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {data.results.slice((page - 1) * 10, page * 10).map((result) => (
                <tr key={result.id}>
                  <td className="ui-cell-strong">{result.subject_name}</td>
                  <td>{result.assignment_score ?? "—"}</td>
                  <td>{result.midterm_score ?? "—"}</td>
                  <td>{result.final_score ?? "—"}</td>
                  <td>{result.score}</td>
                  <td>{result.grade || "—"}</td>
                  <td>{result.comment || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ui-table-foot"><Pagination currentPage={Math.min(page, Math.max(1, Math.ceil(data.results.length / 10)))} totalItems={data.results.length} onPageChange={setPage} /></div>

        <div className="ui-definition">
          <div>
            <span>Total marks</span>
            <b>{data.total}</b>
          </div>
          <div>
            <span>Average</span>
            <b>{data.average}</b>
          </div>
          <div>
            <span>Position</span>
            <b>{data.position ? `${data.position} of ${data.class_size}` : "—"}</b>
          </div>
          <div>
            <span>Attendance</span>
            <b>{percent(data.attendance_rate)}</b>
          </div>
        </div>

        <div className="ui-grid ui-grid-2" style={{ marginTop: 26 }}>
          <div>
            <span className="section-kicker">CLASS TEACHER&apos;S COMMENT</span>
            <div className="ui-signature-line" />
          </div>
          <div>
            <span className="section-kicker">HEAD TEACHER&apos;S COMMENT</span>
            <div className="ui-signature-line" />
          </div>
        </div>
      </section>
    </>
  );
}
