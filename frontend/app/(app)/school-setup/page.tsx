"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Field, FormGrid, Notice, PageHeader, Panel } from "@/components/ui";
import { useList } from "@/lib/useApi";
import type { School } from "@/lib/types";

const TABS = ["Institution", "Campus", "Divisions", "Sessions", "Departments", "Programmes", "Classes & courses", "Grading"];
const DEFAULT_DIVISIONS = [
  { name: "Nursery", code: "NURSERY", order: 1 },
  { name: "Primary", code: "PRIMARY", order: 2 },
  { name: "Secondary", code: "SECONDARY", order: 3 },
  { name: "College / University", code: "HIGHER", order: 4 },
];

type SetupForm = {
  institution: Record<string, string>;
  campus: Record<string, string>;
  campuses: Array<Record<string, string>>;
  divisions: Array<{ name: string; code: string; order: number }>;
  sessions: Array<{ name: string; starts_on: string; ends_on: string; is_current: boolean }>;
  terms: Array<{ name: string; starts_on: string; ends_on: string; session: string; is_current: boolean }>;
  departments: Array<{ name: string; code: string; division: string; divisions: string[]; description: string }>;
  programmes: Array<{ name: string; code: string; division: string; divisions: string[]; department: string; award: string; duration_years: number }>;
  programmes_enabled: boolean;
  classes: Array<{ name: string; level: string; stream: string; capacity: number; division: string; divisions: string[]; programme: string }>;
  subjects: Array<{ name: string; code: string; department: string; department_code: string; division: string; divisions: string[]; programme: string }>;
  grading: { name: string; grading_type: string; divisions: string[]; bands: Array<{ grade: string; min_score: number; max_score: number; points: number; comment: string }> };
};

const INITIAL: SetupForm = {
  institution: { name: "", code: "", institution_type: "school", email: "", phone: "", country: "", city: "", address: "", logo: "" },
  campus: { name: "", code: "", campus_type: "main", email: "", phone: "", city: "", address: "", administrator: "" },
  campuses: [{ name: "", code: "", campus_type: "main", email: "", phone: "", city: "", address: "", administrator: "" }],
  divisions: DEFAULT_DIVISIONS,
  sessions: [{ name: "2026/2027", starts_on: "", ends_on: "", is_current: true }],
  terms: [{ name: "Term 1", starts_on: "", ends_on: "", session: "2026/2027", is_current: true }],
  departments: [{ name: "Sciences", code: "SCI", division: "SECONDARY", divisions: ["SECONDARY"], description: "" }],
  programmes: [{ name: "General programme", code: "GENERAL", division: "SECONDARY", divisions: ["SECONDARY"], department: "SCI", award: "", duration_years: 1 }],
  programmes_enabled: true,
  classes: [{ name: "Form 1", level: "Form 1", stream: "A", capacity: 40, division: "SECONDARY", divisions: ["SECONDARY"], programme: "GENERAL" }],
  subjects: [{ name: "Mathematics", code: "MATH", department: "Sciences", department_code: "SCI", division: "SECONDARY", divisions: ["SECONDARY"], programme: "GENERAL" }],
  grading: { name: "Standard A-F Scale", grading_type: "percentage", divisions: ["NURSERY", "PRIMARY", "SECONDARY", "HIGHER"], bands: [
    { grade: "A", min_score: 80, max_score: 100, points: 4, comment: "Excellent" },
    { grade: "B", min_score: 70, max_score: 79.99, points: 3, comment: "Very good" },
    { grade: "C", min_score: 60, max_score: 69.99, points: 2, comment: "Good" },
    { grade: "D", min_score: 50, max_score: 59.99, points: 1, comment: "Pass" },
    { grade: "F", min_score: 0, max_score: 49.99, points: 0, comment: "Fail" },
  ] },
};

export default function SchoolSetupPage() {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<SetupForm>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const schools = useList<School>("/schools/");
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | "">("");

  useEffect(() => {
    const requestedSchoolId = Number(new URLSearchParams(window.location.search).get("school"));
    if (!selectedSchoolId && requestedSchoolId > 0) setSelectedSchoolId(requestedSchoolId);
  }, [selectedSchoolId]);

  useEffect(() => {
    if (!selectedSchoolId) return;
    const school = schools.data.find((item) => item.id === selectedSchoolId);
    if (school) {
      setForm((current) => ({
        ...current,
        institution: { ...current.institution, name: school.name, code: school.code, email: school.email, phone: school.phone, address: school.address, logo: school.logo },
      }));
    }
  }, [selectedSchoolId, schools.data]);

  function update<K extends keyof SetupForm>(key: K, value: SetupForm[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function updateNested(key: "institution" | "campus", field: string, value: string) { update(key, { ...form[key], [field]: value }); }
  function updateCampus(index: number, field: string, value: string) {
    const campuses = [...form.campuses];
    campuses[index] = { ...campuses[index], [field]: value };
    update("campuses", campuses);
    if (index === 0) update("campus", campuses[0]);
  }
  function addCampus() { update("campuses", [...form.campuses, { name: "", code: "", campus_type: "branch", email: "", phone: "", city: "", address: "", administrator: "" }]); }
  function removeCampus(index: number) { if (form.campuses.length === 1) return; update("campuses", form.campuses.filter((_, itemIndex) => itemIndex !== index)); }
  function updateItem<K extends "divisions" | "sessions" | "terms" | "departments" | "programmes" | "classes" | "subjects">(key: K, index: number, field: string, value: string | number | boolean) {
    const values = [...form[key]] as Array<Record<string, string | number | boolean | string[]>>;
    values[index] = { ...values[index], [field]: value };
    if (field === "division" && typeof value === "string") values[index].divisions = value.split(",").filter(Boolean);
    update(key, values as SetupForm[K]);
  }
  function addItem(key: "divisions" | "sessions" | "terms" | "departments" | "programmes" | "classes" | "subjects") {
    const templates = {
      divisions: { name: "", code: "", order: form.divisions.length + 1 }, sessions: { name: "", starts_on: "", ends_on: "", is_current: false },
      terms: { name: "", starts_on: "", ends_on: "", session: form.sessions[0]?.name || "", is_current: false }, departments: { name: "", code: "", division: "", divisions: [], description: "" },
      programmes: { name: "", code: "", division: "", divisions: [], department: "", award: "", duration_years: 1 }, classes: { name: "", level: "", stream: "", capacity: 40, division: "", divisions: [], programme: "" },
      subjects: { name: "", code: "", department: "", department_code: "", division: "", divisions: [], programme: "" },
    };
    update(key, [...form[key], templates[key]] as SetupForm[typeof key]);
  }
  function removeItem(key: "divisions" | "sessions" | "terms" | "departments" | "programmes" | "classes" | "subjects", index: number) { update(key, form[key].filter((_, itemIndex) => itemIndex !== index) as SetupForm[typeof key]); }
  function toggleCoverage(key: "departments" | "programmes" | "classes" | "subjects", index: number, code: string) {
    const item = form[key][index] as { divisions: string[] };
    const divisions = item.divisions.includes(code) ? item.divisions.filter((value) => value !== code) : [...item.divisions, code];
    updateItem(key, index, "division", divisions.join(","));
  }

  async function completeSetup() {
    setBusy(true); setError(""); setProgress(10);
    try {
      await api.post("/setup/institution/", { ...form, school_id: selectedSchoolId, programmes: form.programmes_enabled ? form.programmes : [] });
      setProgress(100);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.readable : "Setup failed. Review the tabs and try again.");
      setProgress(0);
    } finally { setBusy(false); }
  }

  const divisionOptions = form.divisions.map((item) => <option key={item.code} value={item.code}>{item.name}</option>);
  const departmentOptions = form.departments.map((item) => <option key={item.code} value={item.code}>{item.name}</option>);
  const programmeOptions = form.programmes.map((item) => <option key={item.code} value={item.code}>{item.name}</option>);
  const sessionOptions = form.sessions.map((item) => <option key={item.name} value={item.name}>{item.name}</option>);

  return <>
    <PageHeader eyebrow="SCHOOL SETUP" title="Set up your institution" description="Configure campuses, education divisions, academic sessions, faculties, programmes, classes, courses, and grading in one guided flow." />
    {error && <Notice kind="error">{error}</Notice>}
    {progress > 0 && <div className="ui-progress" aria-label={`Setup progress ${progress}%`}><span style={{ width: `${progress}%` }} /></div>}
    <div className="ui-actions" style={{ marginBottom: 22, flexWrap: "wrap" }}>{TABS.map((label, index) => <button key={label} className={index === tab ? "primary-button" : "ui-ghost-button"} onClick={() => index <= tab && setTab(index)} disabled={busy || index > tab}>{index + 1}. {label}</button>)}</div>
    {(tab === 4 || tab === 5 || tab === 6) && <section className="ui-division-coverage"><strong>Shared division coverage</strong><span>Select every division this item serves.</span>{(tab === 4 ? form.departments : tab === 5 ? form.programmes : form.classes).map((item, index) => <div className="coverage-row" key={index}><b>{item.name || `Item ${index + 1}`}</b>{form.divisions.map((division) => <label key={division.code}><input type="checkbox" checked={item.divisions.includes(division.code)} onChange={() => toggleCoverage(tab === 4 ? "departments" : tab === 5 ? "programmes" : "classes", index, division.code)} />{division.name}</label>)}</div>)}</section>}
    <Panel title={`${tab + 1}. ${TABS[tab]}`}>
      {tab === 5 && <label className="toggle-row"><input type="checkbox" checked={form.programmes_enabled} onChange={(e) => update("programmes_enabled", e.target.checked)} /><span>Configure programmes for this institution</span></label>}
      {tab === 0 && <div className="ui-stack">
        <Field label="Registered school">
          <select required value={selectedSchoolId} onChange={(e) => {
            const schoolId = e.target.value ? Number(e.target.value) : "";
            setSelectedSchoolId(schoolId);
            const school = schools.data.find((item) => item.id === schoolId);
            if (school) setForm((current) => ({ ...current, institution: { ...current.institution, name: school.name, code: school.code, email: school.email, phone: school.phone, address: school.address, logo: school.logo } }));
          }}>
            <option value="">Select a registered school</option>
            {schools.data.map((school) => <option key={school.id} value={school.id}>{school.name} · {school.code}</option>)}
          </select>
        </Field>
        <FormGrid>{Object.entries(form.institution).map(([field, value]) => <Field key={field} label={field.replaceAll("_", " ")}><input value={value} onChange={(e) => updateNested("institution", field, e.target.value)} disabled={field === "name" || field === "code"} /></Field>)}</FormGrid>
      </div>}
      {tab === 1 && <div className="ui-stack">{form.campuses.map((campus, index) => <div className="ui-section" key={index}><div className="ui-actions"><h3>{index === 0 ? "Main campus" : `Campus ${index + 1}`}</h3>{form.campuses.length > 1 && <button type="button" className="ui-icon-button" onClick={() => removeCampus(index)}><Trash2 size={16} /></button>}</div><FormGrid>{Object.entries(campus).map(([field, value]) => <Field key={field} label={field.replaceAll("_", " ")}><input value={value} onChange={(e) => updateCampus(index, field, e.target.value)} /></Field>)}</FormGrid></div>)}<button type="button" className="ui-ghost-button" onClick={addCampus}><Plus size={15} /> Add campus</button></div>}
      {tab === 2 && <div className="ui-stack"><h3>Education divisions</h3>{form.divisions.map((item, index) => <FormGrid key={index}><Field label="Name"><input value={item.name} onChange={(e) => updateItem("divisions", index, "name", e.target.value)} /></Field><Field label="Code"><input value={item.code} onChange={(e) => updateItem("divisions", index, "code", e.target.value)} /></Field><Field label="Order"><input type="number" value={item.order} onChange={(e) => updateItem("divisions", index, "order", Number(e.target.value))} /></Field><button type="button" className="ui-icon-button" onClick={() => removeItem("divisions", index)}><Trash2 size={16} /></button></FormGrid>)}<button className="ui-ghost-button" onClick={() => addItem("divisions")}><Plus size={15} /> Add division</button></div>}
      {tab === 3 && <div className="ui-stack"><h3>Academic sessions</h3>{form.sessions.map((item, index) => <FormGrid key={index}><Field label="Session name"><input value={item.name} onChange={(e) => updateItem("sessions", index, "name", e.target.value)} /></Field><Field label="Starts on"><input type="date" value={item.starts_on} onChange={(e) => updateItem("sessions", index, "starts_on", e.target.value)} /></Field><Field label="Ends on"><input type="date" value={item.ends_on} onChange={(e) => updateItem("sessions", index, "ends_on", e.target.value)} /></Field></FormGrid>)}<button className="ui-ghost-button" onClick={() => addItem("sessions")}><Plus size={15} /> Add session</button><h3>Terms / semesters</h3>{form.terms.map((item, index) => <FormGrid key={index}><Field label="Name"><input value={item.name} onChange={(e) => updateItem("terms", index, "name", e.target.value)} /></Field><Field label="Session"><select value={item.session} onChange={(e) => updateItem("terms", index, "session", e.target.value)}>{sessionOptions}</select></Field><Field label="Starts on"><input type="date" value={item.starts_on} onChange={(e) => updateItem("terms", index, "starts_on", e.target.value)} /></Field><Field label="Ends on"><input type="date" value={item.ends_on} onChange={(e) => updateItem("terms", index, "ends_on", e.target.value)} /></Field></FormGrid>)}<button className="ui-ghost-button" onClick={() => addItem("terms")}><Plus size={15} /> Add term / semester</button></div>}
      {tab === 4 && <div className="ui-stack"><h3>Departments / faculties</h3>{form.departments.map((item, index) => <FormGrid key={index}><Field label="Name"><input value={item.name} onChange={(e) => updateItem("departments", index, "name", e.target.value)} /></Field><Field label="Code"><input value={item.code} onChange={(e) => updateItem("departments", index, "code", e.target.value)} /></Field><Field label="Divisions"><select multiple value={item.divisions} onChange={(e) => updateItem("departments", index, "division", Array.from(e.target.selectedOptions, (option) => option.value).join(","))}>{divisionOptions}</select></Field></FormGrid>)}<button className="ui-ghost-button" onClick={() => addItem("departments")}><Plus size={15} /> Add department</button></div>}
      {tab === 5 && <div className="ui-stack"><h3>Programmes / qualifications</h3>{form.programmes.map((item, index) => <FormGrid key={index}><Field label="Name"><input value={item.name} onChange={(e) => updateItem("programmes", index, "name", e.target.value)} /></Field><Field label="Code"><input value={item.code} onChange={(e) => updateItem("programmes", index, "code", e.target.value)} /></Field><Field label="Divisions"><select multiple value={item.divisions} onChange={(e) => updateItem("programmes", index, "division", Array.from(e.target.selectedOptions, (option) => option.value).join(","))}>{divisionOptions}</select></Field><Field label="Department"><select value={item.department} onChange={(e) => updateItem("programmes", index, "department", e.target.value)}><option value="">Select department</option>{departmentOptions}</select></Field><Field label="Award"><input value={item.award} onChange={(e) => updateItem("programmes", index, "award", e.target.value)} /></Field><Field label="Duration years"><input type="number" value={item.duration_years} onChange={(e) => updateItem("programmes", index, "duration_years", Number(e.target.value))} /></Field></FormGrid>)}<button className="ui-ghost-button" onClick={() => addItem("programmes")}><Plus size={15} /> Add programme</button></div>}
      {tab === 6 && <div className="ui-stack"><h3>Classes / cohorts</h3>{form.classes.map((item, index) => <FormGrid key={index}><Field label="Name"><input value={item.name} onChange={(e) => updateItem("classes", index, "name", e.target.value)} /></Field><Field label="Level"><input value={item.level} onChange={(e) => updateItem("classes", index, "level", e.target.value)} /></Field><Field label="Stream"><input value={item.stream} onChange={(e) => updateItem("classes", index, "stream", e.target.value)} /></Field><Field label="Division"><select value={item.division} onChange={(e) => updateItem("classes", index, "division", e.target.value)}><option value="">Select division</option>{divisionOptions}</select></Field><Field label="Programme"><select value={item.programme} onChange={(e) => updateItem("classes", index, "programme", e.target.value)}><option value="">Select programme</option>{programmeOptions}</select></Field><Field label="Capacity"><input type="number" value={item.capacity} onChange={(e) => updateItem("classes", index, "capacity", Number(e.target.value))} /></Field></FormGrid>)}<button className="ui-ghost-button" onClick={() => addItem("classes")}><Plus size={15} /> Add class / cohort</button><h3>Subjects / courses</h3>{form.subjects.map((item, index) => <FormGrid key={index}><Field label="Name"><input value={item.name} onChange={(e) => updateItem("subjects", index, "name", e.target.value)} /></Field><Field label="Code"><input value={item.code} onChange={(e) => updateItem("subjects", index, "code", e.target.value)} /></Field><Field label="Department code"><select value={item.department_code} onChange={(e) => updateItem("subjects", index, "department_code", e.target.value)}><option value="">Select department</option>{departmentOptions}</select></Field><Field label="Division"><select value={item.division} onChange={(e) => updateItem("subjects", index, "division", e.target.value)}><option value="">Select division</option>{divisionOptions}</select></Field><Field label="Programme"><select value={item.programme} onChange={(e) => updateItem("subjects", index, "programme", e.target.value)}><option value="">Select programme</option>{programmeOptions}</select></Field></FormGrid>)}<button className="ui-ghost-button" onClick={() => addItem("subjects")}><Plus size={15} /> Add subject / course</button></div>}
      {tab === 7 && <div className="ui-stack"><Field label="Grading scale name"><input value={form.grading.name} onChange={(e) => update("grading", { ...form.grading, name: e.target.value })} /></Field><Field label="Grading type"><select value={form.grading.grading_type} onChange={(e) => update("grading", { ...form.grading, grading_type: e.target.value })}><option value="percentage">Percentage bands</option><option value="letter">Letter grades</option><option value="gpa">GPA / points</option><option value="custom">Custom</option></select></Field><Field label="Applies to divisions"><select multiple value={form.grading.divisions} onChange={(e) => update("grading", { ...form.grading, divisions: Array.from(e.target.selectedOptions, (option) => option.value) })}>{divisionOptions}</select></Field><p className="ui-cell-muted">Edit the bands in the grading configuration after setup. One scale can serve multiple divisions.</p></div>}
    </Panel>
    <div className="ui-actions" style={{ marginTop: 22, justifyContent: "space-between" }}><button className="ui-ghost-button" onClick={() => setTab((current) => Math.max(0, current - 1))} disabled={busy || tab === 0}><ChevronLeft size={16} /> Back</button>{tab < TABS.length - 1 ? <button className="primary-button" onClick={() => setTab((current) => current + 1)} disabled={busy || (tab === 0 && !selectedSchoolId)}><ChevronRight size={16} /> Continue</button> : <button className="primary-button" onClick={completeSetup} disabled={busy || !selectedSchoolId || !form.campus.name || !form.campus.code}><Check size={16} /> {busy ? "Setting up school..." : "Complete school setup"}</button>}</div>
  </>;
}
