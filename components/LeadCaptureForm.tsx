"use client";

import { useState } from "react";
import { submitLeadAction } from "@/app/actions";

export default function LeadCaptureForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (status === "success") {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <p className="text-sm font-semibold text-emerald-300">Thanks — we got it.</p>
        <p className="mt-1 text-sm text-slate-300">
          Someone from the team will follow up shortly. In the meantime, try the live demo above.
        </p>
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        setStatus("submitting");
        setErrorMsg(null);
        const result = await submitLeadAction(formData);
        if (result.ok) {
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMsg(result.error);
        }
      }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="lead-name">
          Name
        </label>
        <input
          required
          id="lead-name"
          name="name"
          className="block w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white shadow-sm placeholder:text-slate-500 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
          placeholder="Jane Doe"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="lead-email">
          Work email
        </label>
        <input
          required
          type="email"
          id="lead-email"
          name="email"
          className="block w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white shadow-sm placeholder:text-slate-500 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
          placeholder="jane@company.com"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="lead-company">
          Company
        </label>
        <input
          id="lead-company"
          name="company"
          className="block w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white shadow-sm placeholder:text-slate-500 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
          placeholder="Acme Manufacturing"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="lead-role">
          Role
        </label>
        <select
          id="lead-role"
          name="role"
          defaultValue=""
          className="block w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white shadow-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
        >
          <option value="">Select a role (optional)</option>
          <option value="Manufacturing Engineer">Manufacturing Engineer</option>
          <option value="Process Engineer">Process Engineer</option>
          <option value="Plant Manager">Plant Manager</option>
          <option value="Operations Director">Operations Director</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="lead-message">
          What are you trying to build?
        </label>
        <textarea
          id="lead-message"
          name="message"
          rows={3}
          className="block w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white shadow-sm placeholder:text-slate-500 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
          placeholder="e.g. New stamping line for a bracket family, evaluating vendors for CNC vs. casting"
        />
      </div>

      {status === "error" && errorMsg && (
        <div className="sm:col-span-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {errorMsg}
        </div>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-brand-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "submitting" ? "Sending..." : "Request access"}
        </button>
      </div>
    </form>
  );
}
