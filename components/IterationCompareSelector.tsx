"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Iteration } from "@/lib/types";

export default function IterationCompareSelector({ projectId, iterations }: { projectId: string; iterations: Iteration[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div>
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead className="bg-slate-50">
            <tr>
              <th></th>
              <th>Name</th>
              <th>Status</th>
              <th>Avg score</th>
              <th>Est. cycle time</th>
              <th>Est. cost</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {iterations.map((it) => (
              <tr key={it.id}>
                <td>
                  <input type="checkbox" checked={selected.includes(it.id)} onChange={() => toggle(it.id)} />
                </td>
                <td className="font-medium text-slate-800">{it.name}</td>
                <td className="capitalize">{it.status}</td>
                <td>{it.avg_score}%</td>
                <td>{it.est_cycle_time_min} min</td>
                <td>${it.est_cost_usd}</td>
                <td>{new Date(it.created_at).toLocaleDateString()}</td>
                <td>
                  <Link href={`/projects/${projectId}/iterations/${it.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {iterations.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-slate-400">
                  No iterations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={selected.length < 2}
          className="btn-primary"
          onClick={() => router.push(`/projects/${projectId}/iterations/compare?ids=${selected.join(",")}`)}
        >
          Compare selected ({selected.length})
        </button>
      </div>
    </div>
  );
}
