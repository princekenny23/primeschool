"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Download, Eye, EyeOff, Inbox, MoreHorizontal, Search, X } from "lucide-react";
import { downloadCsv } from "../lib/format";

export function PageHeader({
  eyebrow, title, description, action,
}: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="module-heading">
      <div>
        <span className="section-kicker">{eyebrow}</span>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint, tone = "" }: { label: string; value: string | number; hint?: string; tone?: string }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="ui-panel">
      <header className="ui-panel-head">
        <h3>{title}</h3>
        {action}
      </header>
      <div className="ui-panel-body">{children}</div>
    </section>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (tab: string) => void }) {
  return (
    <div className="ui-tabs" role="tablist">
      {tabs.map((tab) => (
        <button key={tab} role="tab" aria-selected={tab === active} className={tab === active ? "active" : ""} onClick={() => onChange(tab)}>
          {tab}
        </button>
      ))}
    </div>
  );
}

export function Badge({ value }: { value: string }) {
  const tone = value.toLowerCase().replace(/\s+/g, "-");
  return <span className={`ui-badge ui-badge-${tone}`}>{value}</span>;
}

export function Notice({ kind = "error", children }: { kind?: "error" | "success" | "info"; children: React.ReactNode }) {
  return (
    <div className={`ui-notice ui-notice-${kind}`}>
      <AlertCircle size={15} />
      {children}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="ui-empty">
      <Inbox size={26} />
      <h4>{title}</h4>
      {description && <p>{description}</p>}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <div className="ui-loading">{label}</div>;
}

export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="ui-modal-backdrop" onClick={onClose}>
      <div className="ui-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header>
          <h3>{title}</h3>
          <button onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="ui-modal-body">{children}</div>
        {footer && <footer className="ui-modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="ui-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="ui-form-grid">{children}</div>;
}

export function PasswordInput({
  value, onChange, placeholder, autoComplete = "new-password", required,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const [reveal, setReveal] = useState(false);
  return (
    <span className="ui-password">
      <input
        type={reveal ? "text" : "password"}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
      <button type="button" onClick={() => setReveal(!reveal)} aria-label={reveal ? "Hide password" : "Show password"}>
        {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </span>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="ui-section">
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}

export interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  value?: (row: T) => string | number;
}

export interface RowAction {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function Pagination({
  currentPage, totalItems, pageSize = 10, onPageChange,
}: { currentPage: number; totalItems: number; pageSize?: number; onPageChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const firstPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => firstPage + index);
  const firstItem = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="ui-pagination-wrap">
      <span className="ui-pagination-count">Showing {firstItem}–{lastItem} of {totalItems}</span>
      {totalPages > 1 && (
        <nav className="ui-pagination" aria-label="Table pages">
          <button type="button" className="ui-page-button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1} aria-label="Previous page">
            <ChevronLeft size={15} />
            <span>Previous</span>
          </button>
          {pages.map((page) => (
            <button key={page} type="button" className={`ui-page-button ui-page-number ${page === currentPage ? "active" : ""}`} onClick={() => onPageChange(page)} aria-current={page === currentPage ? "page" : undefined} aria-label={`Page ${page}`}>
              {page}
            </button>
          ))}
          <button type="button" className="ui-page-button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages} aria-label="Next page">
            <span>Next</span>
            <ChevronRight size={15} />
          </button>
        </nav>
      )}
    </div>
  );
}

export function RowActions({ actions, label = "Row actions" }: { actions: RowAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !wrapper.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (!actions.length) return null;

  return (
    <div className="menu-button-wrap operation-action-menu" ref={wrapper} onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        className="menu-button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        onClick={(event) => {
          event.stopPropagation();
          if (open) {
            setOpen(false);
            return;
          }
          const rect = event.currentTarget.getBoundingClientRect();
          setPosition({
            left: Math.max(8, Math.min(rect.right - 220, window.innerWidth - 228)),
            top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 220)),
          });
          setOpen(true);
        }}
      >
        <MoreHorizontal size={17} />
      </button>
      <div className={`menu-panel ${open ? "is-open" : ""}`} role="menu" style={open ? position : undefined}>
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            role="menuitem"
            disabled={action.disabled}
            className={action.danger ? "danger-menu-item" : undefined}
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
              action.onSelect();
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DataTable<T>({
  columns, rows, searchable = true, searchPlaceholder = "Search", exportName, emptyText = "Nothing to show yet.", onRowClick, toolbar, rowActions,
}: {
  columns: Column<T>[];
  rows: T[];
  searchable?: boolean;
  searchPlaceholder?: string;
  exportName?: string;
  emptyText?: string;
  onRowClick?: (row: T) => void;
  toolbar?: React.ReactNode;
  rowActions?: (row: T) => RowAction[];
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const text = (row: T) => columns.map((column) => column.value?.(row) ?? "").join(" ").toLowerCase();
  const filtered = useMemo(
    () => (query ? rows.filter((row) => text(row).includes(query.toLowerCase())) : rows),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, query]
  );
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const exportRows = () =>
    downloadCsv(
      `${exportName}.csv`,
      columns.map((column) => column.header),
      filtered.map((row) => columns.map((column) => column.value?.(row) ?? ""))
    );

  return (
    <div className="ui-table-card">
      {(searchable || toolbar || exportName) && (
        <div className="data-toolbar">
          {searchable && (
            <label className="ui-search">
              <Search size={15} />
              <input value={query} placeholder={searchPlaceholder} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
            </label>
          )}
          <div className="toolbar-actions">
            {toolbar}
            {exportName && (
              <button onClick={exportRows} className="ui-ghost-button">
                <Download size={15} />
                Export
              </button>
            )}
          </div>
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.header}>{column.header}</th>
              ))}
              {rowActions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr key={(currentPage - 1) * pageSize + index} onClick={() => onRowClick?.(row)} className={onRowClick ? "ui-clickable" : ""}>
                {columns.map((column) => (
                  <td key={column.header}>{column.cell(row)}</td>
                ))}
                {rowActions && <td><RowActions actions={rowActions(row)} /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && <EmptyState title={emptyText} />}
      <footer className="ui-table-foot">
        <Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={pageSize} onPageChange={setPage} />
      </footer>
    </div>
  );
}

export function BarChart({ data, suffix = "" }: { data: { name: string; value: number }[]; suffix?: string }) {
  const max = Math.max(1, ...data.map((point) => point.value));
  return (
    <div className="ui-chart">
      {data.map((point) => (
        <div className="ui-chart-col" key={point.name}>
          <div className="ui-chart-bar" style={{ height: `${Math.round((point.value / max) * 100)}%` }} title={`${point.value}${suffix}`} />
          <span>{point.name}</span>
        </div>
      ))}
    </div>
  );
}
