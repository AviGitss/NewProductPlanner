import Link from "next/link";
import { WorkflowStepsMarketing } from "@/components/WorkflowSteps";
import LeadCaptureForm from "@/components/LeadCaptureForm";

export default function Home() {
  return (
    <div className="bg-slate-950 text-white">
      {/* ---------------- Nav ---------------- */}
      <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-500 text-sm font-bold text-slate-950">
              MP
            </div>
            <span className="text-sm font-semibold tracking-wide">MfgPlan</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white">
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-md border border-slate-700 px-3.5 py-2 text-sm font-medium text-slate-200 hover:border-slate-500 hover:text-white"
            >
              Try live demo
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden border-b border-slate-800/80">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #3357f7 1px, transparent 1px), linear-gradient(to bottom, #3357f7 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="inline-flex items-center rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-300">
              Manufacturing line planning
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              Plan new manufacturing lines with AI-assisted machine selection
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-400">
              Enter a component&rsquo;s parameters, describe the process in plain English, and get a
              scored, explainable equipment recommendation for every stage — from raw material to
              packaged part. Visualize the line, simulate a digital twin, and export a report before
              you commit capital.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/dashboard" className="btn-primary bg-brand-500 text-slate-950 hover:bg-brand-400">
                Try live demo — no signup
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-700 px-3.5 py-2 text-sm font-medium text-slate-200 hover:border-slate-500 hover:text-white"
              >
                Get started
              </Link>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              The live demo runs in-memory with a pre-seeded sample project — nothing to configure.
            </p>
          </div>

          {/* Stylized process-flow visual */}
          <div className="relative rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
              <span className="ml-2 text-xs text-slate-500">process-flow.mfgplan</span>
            </div>
            <svg viewBox="0 0 460 260" className="w-full" role="img" aria-label="Stylized process flow diagram">
              {[
                { x: 10, y: 30, label: "Cutting", score: 92 },
                { x: 170, y: 10, label: "CNC Mill", score: 88 },
                { x: 330, y: 30, label: "Deburr", score: 95 },
                { x: 90, y: 140, label: "Anodize", score: 81 },
                { x: 250, y: 160, label: "Inspect", score: 97 },
                { x: 10, y: 210, label: "Assembly", score: 90 },
              ].map((n, i) => (
                <g key={i}>
                  <rect
                    x={n.x}
                    y={n.y}
                    width="110"
                    height="46"
                    rx="8"
                    fill="#0f172a"
                    stroke="#3357f7"
                    strokeWidth="1.5"
                  />
                  <text x={n.x + 10} y={n.y + 19} fontSize="11" fill="#e2e8f0" fontWeight="600">
                    {n.label}
                  </text>
                  <text x={n.x + 10} y={n.y + 34} fontSize="10" fill="#5c82ff">
                    {n.score}% match
                  </text>
                </g>
              ))}
              <path d="M120 53 L170 33" stroke="#334155" strokeWidth="2" fill="none" />
              <path d="M280 33 L330 53" stroke="#334155" strokeWidth="2" fill="none" />
              <path d="M65 76 L110 140" stroke="#334155" strokeWidth="2" fill="none" />
              <path d="M200 163 L250 183" stroke="#334155" strokeWidth="2" fill="none" />
              <path d="M120 233 L250 183" stroke="#334155" strokeWidth="2" fill="none" />
            </svg>
          </div>
        </div>
      </section>

      {/* ---------------- Workflow ---------------- */}
      <section className="border-b border-slate-800/80 bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-400">How it works</h2>
            <p className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
              One workflow, from raw part parameters to a defensible line plan
            </p>
          </div>
          <WorkflowStepsMarketing />
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section className="border-b border-slate-800/80">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-400">What&rsquo;s inside</h2>
            <p className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Built for real planning decisions, not slideware</p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Plain-English process parsing",
                body: "Describe your process in a sentence — \"cut the blank, CNC mill the pockets, deburr, then anodize\" — and a deterministic, rule-based parser turns it into ordered, editable stages. No LLM calls, fully offline and reproducible.",
              },
              {
                title: "Weighted machine scoring",
                body: "Every candidate machine is scored 0-100% against hardness, tensile strength, tolerance, work envelope, and surface finish requirements — a transparent, explainable breakdown per factor, not a black box.",
              },
              {
                title: "Digital thread, component to report",
                body: "Trace the full lineage from a component's CAD reference and parameters through its process stages, selected machines, and final report — one connected record per iteration.",
              },
              {
                title: "Simulated digital twin",
                body: "Watch live-style telemetry — utilization, cycle time, machine status — for every machine selected in an iteration, so you can spot bottlenecks before the line exists.",
              },
              {
                title: "Iteration history & comparison",
                body: "Save multiple line configurations per component and compare them side by side on score, cycle time, and cost to arrive at a recommended configuration.",
              },
              {
                title: "Printable / exportable reports",
                body: "Generate a clean report of the recommended line — stages, machines, scores, and estimates — ready to print or export as a PDF for stakeholders.",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
                <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Lead capture ---------------- */}
      <section className="bg-slate-900/40">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="mb-8 text-center">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-400">Get in touch</h2>
            <p className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
              Planning a new line? Let&rsquo;s talk.
            </p>
            <p className="mt-3 text-sm text-slate-400">
              Tell us what you&rsquo;re building and we&rsquo;ll follow up — or just jump into the live demo above, no
              form required.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
            <LeadCaptureForm />
          </div>
        </div>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-slate-800/80 px-6 py-8 text-center text-xs text-slate-500">
        MfgPlan — manufacturing line planning platform.{" "}
        <Link href="/dashboard" className="text-brand-400 hover:text-brand-300">
          Try the live demo
        </Link>
        .
      </footer>
    </div>
  );
}
