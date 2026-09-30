"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Upload,
  Trash2,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Loader2,
  Info,
} from "lucide-react";

import {
  api,
  type AssessmentView,
  type AssessmentResult,
  type MyApplication,
} from "@/lib/api";
import AvailabilityEditor from "../availability/AvailabilityEditor";

const ACCENT = "#C8956D";

// The kind values must match DOC_KINDS in astrologer_service.py exactly; the
// backend rejects anything else. Identity documents are self-declared, and the
// service additionally requires at least one credential before submitting.
const DOC_KINDS = [
  { value: "degree_certificate", label: "Astrology qualification", hint: "Certificate, diploma or course completion.", credential: true },
  { value: "professional_cert", label: "Professional certificate", hint: "Membership or professional body registration.", credential: true },
  { value: "experience_letter", label: "Experience letter", hint: "A letter or record of practice.", credential: true },
  { value: "pan", label: "PAN card", hint: "Photo of your PAN card.", credential: false },
  { value: "aadhaar", label: "Aadhaar (front)", hint: "Front side only.", credential: false },
  { value: "address_proof", label: "Address proof", hint: "Any recent bill or statement.", credential: false },
  { value: "other", label: "Other supporting document", hint: "Anything else a reviewer should see.", credential: true },
];

const DOC_STATUS: Record<string, string> = {
  self_declared: "Waiting for a reviewer",
  admin_verified: "Accepted by a reviewer",
  rejected: "Rejected by a reviewer",
};

const SPECIALTY_OPTIONS = [
  "Vedic", "KP System", "Numerology", "Tarot", "Palmistry", "Vastu",
  "Prashna", "Nadi", "Face Reading", "Gemstone", " Muhurat", "Remedies",
];

const LANGUAGE_OPTIONS = ["English", "Hindi", "Sanskrit", "Marathi", "Tamil", "Telugu", "Bengali", "Gujarati"];

type Step = "profile" | "documents" | "availability" | "review";

export default function ApplyPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-5 py-16 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>Loading…</div>}>
      <ApplyWizard />
    </Suspense>
  );
}

function ApplyWizard() {
  const router = useRouter();
  const search = useSearchParams();
  const startAtAssessment = search.get("step") === "assessment";

  const [app, setApp] = useState<MyApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>(startAtAssessment ? "documents" : "profile");

  // Profile fields
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("0");
  const [location, setLocation] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);

  // Assessment
  const [view, setView] = useState<AssessmentView | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  // The application itself tells us whether one exists, so there is no
  // separate `started` flag to keep in sync with it.

  /** Pull the application into the form fields. No-op when there is none. */
  const hydrate = useCallback((a: MyApplication | null) => {
    setApp(a);
    if (!a) return;
    setHeadline(a.headline ?? "");
    setBio(a.bio ?? "");
    setExperience(String(a.experience_years ?? 0));
    setLocation(a.location ?? "");
    setSpecialties(a.specialties ?? []);
    setLanguages(a.languages ?? []);
  }, []);

  // Both fetchers only publish data; `loading` is entered by whoever triggers
  // them, so neither effect sets state synchronously while mounting.
  const load = useCallback(async () => {
    try {
      hydrate((await api.getMyApplication()).application);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your application.");
    } finally {
      setLoading(false);
    }
  }, [hydrate]);

  const loadAssessment = useCallback(async () => {
    try {
      setView(await api.getAssessment());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the assessment.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .getMyApplication()
      .then((res) => {
        if (cancelled) return;
        // Read-only: landing here creates nothing. A visitor who has not
        // committed gets an explanation and an explicit "Start application"
        // button, so a row is only written on a deliberate click.
        hydrate(res.application);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not load your application.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  /** The one call that creates the application. Idempotent server-side. */
  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      hydrate(await api.startApplication());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start your application.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!startAtAssessment) return;
    let cancelled = false;
    api
      .getAssessment()
      .then((v) => {
        if (!cancelled) setView(v);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not load the assessment.");
      });
    return () => {
      cancelled = true;
    };
  }, [startAtAssessment]);

  const saveProfile = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.updateMyApplication({
        headline: headline.trim(),
        bio: bio.trim(),
        experience_years: Number(experience) || 0,
        languages,
        specialties,
        location: location.trim() || null,
      });
      setApp(updated);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your profile.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const upload = async (kind: string, file: File) => {
    setBusy(true);
    setError(null);
    try {
      await api.uploadDocument(kind, file);
      hydrate((await api.getMyApplication()).application);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const removeDoc = async (id: number) => {
    setBusy(true);
    try {
      await api.deleteDocument(id);
      hydrate((await api.getMyApplication()).application);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove the document.");
    } finally {
      setBusy(false);
    }
  };

  const submitAssessment = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.submitAssessment(
        Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v]))
      );
      setResult(res);
      hydrate((await api.getMyApplication()).application);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit the assessment.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (list: string[], set: (v: string[]) => void, value: string) => {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center text-sm" style={{ color: "var(--text-tertiary)" }} role="status">
        Loading…
      </div>
    );
  }

  if (error && !app && !loading) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center">
        <AlertTriangle className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--danger)" }} />
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>{error}</p>
        <button className="btn-secondary text-sm" onClick={load}>Retry</button>
      </div>
    );
  }

  if (!app) {
    // The start gate. Landing here creates nothing, so an application row is
    // only written when someone commits by pressing the button below. The
    // criteria are stated first so that is an informed choice.
    return (
      <div className="max-w-2xl mx-auto px-5 py-14">
        <header className="mb-8 text-center">
          <h1 className="font-display text-3xl mb-2" style={{ color: "var(--text-primary)" }}>
            Practise on AstroSeva
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Here is what applying involves, before you create anything.
          </p>
        </header>

        <ol className="space-y-3 mb-8">
          {[
            {
              t: "Fill in your profile",
              d: "What you specialise in, your experience, and the languages you consult in.",
            },
            {
              t: "Upload documents",
              d: "A qualification or experience document is required. Identity documents are optional.",
            },
            {
              t: "Take a qualification test",
              d: "10 questions, auto-graded, 8 to pass. Unattended and free.",
            },
            {
              t: "Complete a mock consultation",
              d: "A reviewer scores you on accuracy, clarity, empathy and structure.",
            },
            {
              t: "Get a decision",
              d: "Verified, approved on probation, or told why.",
            },
          ].map((s, i) => (
            <li
              key={s.t}
              className="flex gap-3 p-3 rounded-lg"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0"
                style={{ background: "rgba(200,149,109,0.15)", color: ACCENT }}
              >
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm" style={{ color: "var(--text-primary)" }}>
                  {s.t}
                </span>
                <span className="block text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  {s.d}
                </span>
              </span>
            </li>
          ))}
        </ol>

        <div
          className="rounded-lg p-3 text-xs flex gap-2 mb-6"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
        >
          <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: ACCENT }} />
          <span>
            Documents are <strong>self-declared</strong> and checked by a human reviewer.
            AstroSeva does not verify identity against any government register.
          </span>
        </div>

        <div className="text-center">
          <button className="btn-primary text-sm" onClick={start} disabled={busy}>
            {busy ? "Creating…" : "Start application"}
          </button>
          <p className="text-[11px] mt-3" style={{ color: "var(--text-tertiary)" }}>
            This creates a draft you can leave and come back to. Nothing is submitted until
            you choose to submit it.
          </p>
        </div>
      </div>
    );
  }

  const locked = !["draft", "rejected"].includes(app.status);
  const uploadedKinds = new Set(app.documents.map((d) => d.kind));
  // The backend requires at least one CREDENTIAL_DOC_KINDS entry, not one
  // specific kind, so the gate is "any credential" rather than a required list.
  // Derived from DOC_KINDS, which is the single list kept in step with the
  // backend's DOC_KINDS, instead of a second literal that could drift from it.
  const CREDENTIALS = DOC_KINDS.filter((d) => d.credential).map((d) => d.value);
  const hasCredential = CREDENTIALS.some((k) => uploadedKinds.has(k));
  const profileComplete =
    headline.trim().length > 0 && bio.trim().length > 0 && specialties.length > 0 && languages.length > 0;
  const canSubmit = profileComplete && hasCredential;
  // Named after what it lists, so the review step reads correctly. It was
  // `missingDocs` but only ever held the single missing-credential entry.
  const missingCredentials = DOC_KINDS.filter(
    (d) => d.credential && !uploadedKinds.has(d.value)
  );
  const assessmentOpen = app.status === "assessment_pending";

  if (locked) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center">
        <Info className="w-8 h-8 mx-auto mb-3" style={{ color: ACCENT }} />
        <h1 className="font-display text-2xl mb-2" style={{ color: "var(--text-primary)" }}>
          Your application is locked
        </h1>
        <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
          While your application is <strong>{app.status.replace(/_/g, " ")}</strong>, your
          details are frozen so a reviewer is not looking at a moving target. If you need to
          correct something, contact support.
        </p>
        {assessmentOpen && (
          <div className="max-w-md mx-auto mb-6 text-left">
            <AssessmentPanel
              view={view}
              answers={answers}
              result={result}
              busy={busy}
              onLoad={loadAssessment}
              onAnswer={(q, i) => setAnswers((p) => ({ ...p, [q]: i }))}
              onSubmit={submitAssessment}
            />
          </div>
        )}
        <Link href="/astrologer/dashboard" className="btn-primary text-sm">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const STEPS: { key: Step; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "documents", label: "Documents" },
    { key: "availability", label: "Availability" },
    { key: "review", label: "Review" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl mb-2" style={{ color: "var(--text-primary)" }}>
          Become an AstroSeva astrologer
        </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Four short steps. You can save and come back at any time before
            submitting, and nothing is sent to a reviewer until you press
            &ldquo;Save and submit&rdquo;.
          </p>
      </header>

      {error && (
        <div className="rounded-lg p-4 mb-5 text-sm flex gap-2 items-start"
          style={{ color: "var(--danger)", border: "1px solid var(--danger)" }} role="alert">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {/* Stepper */}
      <ol className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const idx = STEPS.findIndex((x) => x.key === step);
          const done = i < idx;
          return (
            <li key={s.key} className="flex items-center gap-2 flex-1 last:flex-none">
              <button
                onClick={() => setStep(s.key)}
                className="flex items-center gap-2 text-xs"
                style={{ color: i === idx ? ACCENT : done ? "var(--text-primary)" : "var(--text-tertiary)" }}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    background: i <= idx ? "rgba(200,149,109,0.15)" : "var(--bg-surface)",
                    border: `1px solid ${i === idx ? ACCENT : "var(--border-subtle)"}`,
                    color: i <= idx ? ACCENT : "var(--text-tertiary)",
                  }}
                >
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </span>
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <span className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
              )}
            </li>
          );
        })}
      </ol>

      {step === "profile" && (
        <div className="space-y-5">
          <Field label="Headline" hint="One line: what you specialise in.">
            <input className="input-field w-full" value={headline} maxLength={120}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Vedic and KP astrologer with 12 years' practice" />
          </Field>

          <Field label="About you" hint={`${bio.length}/2000 characters. What you offer and how you work.`}>
            <textarea className="input-field w-full min-h-32" value={bio} maxLength={2000}
              onChange={(e) => setBio(e.target.value)} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Years of experience">
              <input className="input-field w-full" type="number" min={0} max={80}
                value={experience} onChange={(e) => setExperience(e.target.value)} />
            </Field>
            <Field label="Location" hint="City is enough.">
              <input className="input-field w-full" value={location} maxLength={80}
                onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Pune, India" />
            </Field>
          </div>

          <Field label="Specialities" hint="Pick at least one.">
            <div className="flex flex-wrap gap-2">
              {SPECIALTY_OPTIONS.map((s) => {
                const on = specialties.includes(s);
                return (
                  <button key={s} type="button" onClick={() => toggle(specialties, setSpecialties, s)}
                    className="text-xs px-3 py-1.5 rounded-full"
                    style={{
                      background: on ? "rgba(200,149,109,0.15)" : "var(--bg-surface)",
                      color: on ? ACCENT : "var(--text-secondary)",
                      border: `1px solid ${on ? ACCENT : "var(--border-subtle)"}`,
                    }}>
                    {s}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Languages" hint="The languages you consult in.">
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((l) => {
                const on = languages.includes(l);
                return (
                  <button key={l} type="button" onClick={() => toggle(languages, setLanguages, l)}
                    className="text-xs px-3 py-1.5 rounded-full"
                    style={{
                      background: on ? "rgba(200,149,109,0.15)" : "var(--bg-surface)",
                      color: on ? ACCENT : "var(--text-secondary)",
                      border: `1px solid ${on ? ACCENT : "var(--border-subtle)"}`,
                    }}>
                    {l}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="flex justify-end gap-3">
            <button className="btn-secondary text-sm" onClick={load} disabled={busy}>Discard</button>
            <button className="btn-primary text-sm" onClick={async () => {
              if (await saveProfile()) setStep("documents");
            }} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save and continue
            </button>
          </div>
        </div>
      )}

      {step === "documents" && (
        <div className="space-y-4">
          <div className="rounded-lg p-3 text-xs flex gap-2"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: ACCENT }} />
            <span>
              These documents are <strong>self-declared</strong> and checked by a human
              reviewer. AstroSeva does not verify identity against any government register,
              and uploading a document you do not own may end your application.
            </span>
          </div>

          {/* Credentials are listed first: the backend needs at least one. */}
          {DOC_KINDS.map((d) => {
            const existing = app.documents.find((x) => x.kind === d.value);
            return (
              <div key={d.value} className="rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                <div className="min-w-0">
                  <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                    {d.label}
                    {d.credential && (
                      <span className="ml-1.5 text-[10px]" style={{ color: ACCENT }}>
                        counts as your qualification
                      </span>
                    )}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{d.hint}</p>
                  {existing && (
                    <p
                      className="text-xs mt-1"
                      style={{
                        color:
                          existing.identity_status === "admin_verified"
                            ? ACCENT
                            : existing.identity_status === "rejected"
                              ? "var(--danger)"
                              : "var(--text-tertiary)",
                      }}
                    >
                      {DOC_STATUS[existing.identity_status] ?? existing.identity_status}
                      {existing.reviewer_note ? ` — ${existing.reviewer_note}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {existing ? (
                    <button className="btn-ghost text-xs" onClick={() => removeDoc(existing.id)} disabled={busy}>
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  ) : (
                    <label className="btn-secondary text-xs cursor-pointer">
                      <Upload className="w-3.5 h-3.5" /> Upload
                      <input type="file" className="hidden" accept="image/jpeg,image/png,application/pdf"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) upload(d.value, f);
                          e.target.value = "";
                        }} />
                    </label>
                  )}
                </div>
              </div>
            );
          })}

          <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            JPEG, PNG or PDF up to 5 MB.
          </p>

            <div className="flex justify-between gap-3">
              <button className="btn-ghost text-sm" onClick={() => setStep("availability")}>
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            <button className="btn-primary text-sm" onClick={() => setStep("availability")}>
              Availability <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === "availability" && (
        <div className="space-y-5">
          <div className="rounded-lg p-3 text-xs flex gap-2"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: ACCENT }} />
            <span>
              Optional, but a profile with published hours is far more useful than one
              without. You can change these at any time from your dashboard.
            </span>
          </div>

          <section className="rounded-xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
            <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>
              When are you available?
            </h2>
            <AvailabilityEditor />
          </section>

          <div className="flex justify-between gap-3">
            <button className="btn-ghost text-sm" onClick={() => setStep("documents")}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button className="btn-primary text-sm" onClick={() => setStep("review")}>
              Review <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-5">
          <section className="rounded-xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Profile</h2>
            <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{headline || "—"}</p>
            <p className="text-xs mb-3" style={{ color: "var(--text-tertiary)" }}>
              {experience} years · {location || "no location"} · {languages.join(", ") || "no languages"}
            </p>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{specialties.join(", ") || "no specialities"}</p>
          </section>

          <section className="rounded-xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>
              Documents ({app.documents.length})
            </h2>
            {missingCredentials.length > 0 ? (
              <ul className="space-y-1.5">
                {missingCredentials.map((d) => (
                  <li key={d.value} className="text-xs flex items-center gap-2" style={{ color: "var(--danger)" }}>
                    <XCircle className="w-3.5 h-3.5" /> {d.label} still missing
                  </li>
                ))}
                <li className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  Any one of these will do. Identity documents are optional.
                </li>
              </ul>
            ) : (
              <p className="text-xs flex items-center gap-2" style={{ color: ACCENT }}>
                <CheckCircle2 className="w-3.5 h-3.5" /> A qualification document is on file
              </p>
            )}
          </section>

          <section className="rounded-xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
            <h2 className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>What happens next</h2>
            <ol className="text-xs space-y-1.5 list-decimal pl-4" style={{ color: "var(--text-secondary)" }}>
              <li>A reviewer checks your documents by eye.</li>
              <li>You take a 10-question qualification test. 8 to pass.</li>
              <li>A reviewer scores a mock consultation against four criteria.</li>
              <li>You are verified and listed, approved on probation, or given a reason.</li>
            </ol>
          </section>

          <div className="flex justify-between gap-3">
            <button className="btn-ghost text-sm" onClick={() => setStep("documents")}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex items-center gap-3">
              {!canSubmit && (
                <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {!profileComplete
                    ? "Complete your profile"
                    : "Add a qualification document"}
                </span>
              )}
              <button className="btn-primary text-sm" disabled={!canSubmit || busy}
                onClick={async () => {
                  // Save the profile AND submit it. This previously only saved,
                  // then navigated to the dashboard, which showed a draft the
                  // applicant had to submit a second time from there -- with
                  // the button reading "Save and submit".
                  const ok = await saveProfile();
                  if (!ok) return;
                  setBusy(true);
                  setError(null);
                  try {
                    const submitted = await api.submitApplication();
                    setApp(submitted);
                    router.push("/astrologer/dashboard");
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Could not submit your application."
                    );
                  } finally {
                    setBusy(false);
                  }
                }}>
                {busy ? "Submitting…" : "Save and submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="input-label">{label}</label>
      {hint && <p className="text-[11px] mb-2" style={{ color: "var(--text-tertiary)" }}>{hint}</p>}
      <div className={hint ? "" : "mt-2"}>{children}</div>
    </div>
  );
}

function AssessmentPanel({
  view, answers, result, busy, onLoad, onAnswer, onSubmit,
}: {
  view: AssessmentView | null;
  answers: Record<number, number>;
  result: AssessmentResult | null;
  busy: boolean;
  onLoad: () => void;
  onAnswer: (q: number, i: number) => void;
  onSubmit: () => void;
}) {
  if (result) {
    return (
      <div className="rounded-xl p-5" style={{ background: "var(--bg-surface)", border: `1px solid ${result.passed ? ACCENT : "var(--danger)"}` }}>
        <h2 className="text-sm font-medium mb-2" style={{ color: result.passed ? ACCENT : "var(--danger)" }}>
          {result.passed ? "Assessment passed" : "Assessment not passed"}
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          You scored {result.score} out of {result.max_score}. {result.pass_mark} needed to pass.
        </p>
        <ul className="space-y-3 text-xs">
          {result.details.map((d) => (
            <li key={d.id}>
              <span className="flex items-center gap-2" style={{ color: d.correct ? ACCENT : "var(--danger)" }}>
                {d.correct ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                Question {d.id}
              </span>
              <p className="mt-1 ml-5.5" style={{ color: "var(--text-tertiary)" }}>{d.explanation}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (!view) {
    return (
      <button className="btn-primary text-sm w-full" onClick={onLoad}>
        Start the assessment
      </button>
    );
  }

  const answered = Object.keys(answers).length;
  const allAnswered = answered === view.questions.length;

  return (
    <div className="rounded-xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
      <h2 className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
        Qualification assessment
      </h2>
      <p className="text-xs mb-5" style={{ color: "var(--text-tertiary)" }}>
        {view.questions.length} questions, {view.pass_mark} to pass. You have taken this{" "}
        {view.attempts} time{view.attempts === 1 ? "" : "s"}.
        {answered > 0 && ` ${answered} answered.`}
      </p>

      <ol className="space-y-5 mb-6">
        {view.questions.map((q, qi) => (
          <li key={q.id}>
            <p className="text-sm mb-2" style={{ color: "var(--text-primary)" }}>
              <span style={{ color: ACCENT }}>{qi + 1}.</span> {q.prompt}
            </p>
            <div className="space-y-1.5">
              {q.options.map((opt, oi) => {
                const on = answers[q.id] === oi;
                return (
                  <button key={oi} type="button" onClick={() => onAnswer(q.id, oi)}
                    className="w-full text-left text-xs px-3 py-2 rounded"
                    style={{
                      background: on ? "rgba(200,149,109,0.12)" : "transparent",
                      border: `1px solid ${on ? ACCENT : "var(--border-subtle)"}`,
                      color: on ? "var(--text-primary)" : "var(--text-secondary)",
                    }}>
                    {String.fromCharCode(65 + oi)}. {opt}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <button className="btn-primary text-sm w-full" onClick={onSubmit} disabled={!allAnswered || busy}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Submit answers
      </button>
      {!allAnswered && (
        <p className="text-[11px] mt-2 text-center" style={{ color: "var(--text-tertiary)" }}>
          Answer every question to submit.
        </p>
      )}
    </div>
  );
}
