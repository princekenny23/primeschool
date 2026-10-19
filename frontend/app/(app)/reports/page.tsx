"use client";

import { useState } from "react";
import { Download, Play } from "lucide-react";
import { EmptyState, Field, Loading, Notice, PageHeader, Panel, Pagination } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { downloadCsv } from "@/lib/format";
import { useList } from "@/lib/useApi";
import type { ClassRoom, ReportResult } from "@/lib/types";

const REPORTS = [
  { group: "Students", options: [{ key: "student-list", label: "Student list" }] },
  { group: "Attendance", options: [{ key: "attendance-summary", label: "Student attendance summary" }] },
  { group: "Academic", options: [{ key: "class-performance", label: "Class performance" }] },
  {
    group: "Finance",
    options: [
      { key: "fee-collection", label: "Fee collection" },
      { key: "outstanding-fees", label: "Outstanding fees" },
    ],
  },
];

export default function ReportsPage() {
  const classes = useList<ClassRoom>("/class-rooms/");
  const [report, setReport] = useState("student-list");
  const [classroom, setClassroom] = useState("");
  const [result, setResult] = useState<ReportResult | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const label = REPORTS.flatMap((group) => group.options).find((option) => option.key === report)?.label ?? report;

  async function generate() {
    setLoading(true);
    setError("");
    setPage(1);
    try {
      setResult(await api.get<ReportResult>("/reports/", { report, classroom }));
    } catch (err) {
      setError(err instanceof ApiError ? err.readable : "Could not generate the report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="INSIGHTS"
        title="Reporting centre"
        description="Filter, generate and export the reports your school runs regularly."
        action={
          <button className="primary-button" onClick={generate} disabled={loading}>
            <Play size={16} />
            {loading ? "Generating…" : "Generate"}
          </button>
        }
      />

      <div className="ui-filter-bar">
        <Field label="Report">
          <select value={report} onChange={(event) => setReport(event.target.value)}>
            {REPORTS.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.options.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
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
      </div>

      {error && <Notice>{error}</Notice>}

      <Panel
        title={label}
        action={
          result?.rows.length ? (
            <button className="ui-ghost-button" onClick={() => downloadCsv(`${report}.csv`, result.columns, result.rows)}>
              <Download size={15} />
              Export CSV
            </button>
          ) : undefined
        }
      >
        {loading ? (
          <Loading label="Crunching the numbers…" />
        ) : result ? (
          result.rows.length ? (
            <>
              <div className="table-wrap">
                <table>
                <thead>
                  <tr>
                    {result.columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.slice((page - 1) * 10, page * 10).map((row, index) => (
                    <tr key={index}>
                      {row.map((cell, position) => (
                        <td key={position}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
              <div className="ui-table-foot"><Pagination currentPage={Math.min(page, Math.max(1, Math.ceil(result.rows.length / 10)))} totalItems={result.rows.length} onPageChange={setPage} /></div>
            </>
          ) : (
            <EmptyState title="No data for these filters" />
          )
        ) : (
          <EmptyState title="Pick a report and press Generate" />
        )}
      </Panel>
    </>
  );
}
