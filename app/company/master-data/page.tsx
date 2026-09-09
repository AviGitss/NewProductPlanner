import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import MasterDataUpload from "@/components/MasterDataUpload";
import { getCurrentUserContext } from "@/lib/auth";
import { listMasterEquipment, listMasterMaterials } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function MasterDataPage() {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId) redirect("/register-company");
  if (ctx.role !== "admin" && ctx.role !== "rfp_prep") redirect("/dashboard");

  const [equipment, materials] = await Promise.all([listMasterEquipment(ctx.companyId), listMasterMaterials(ctx.companyId)]);

  return (
    <div>
      <PageHeader title="Master data" subtitle="Company-wide equipment and material catalogs" />
      <div className="space-y-6 p-8">
        <MasterDataUpload />

        <section className="card card-pad">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Uploaded equipment ({equipment.length})</h2>
          {equipment.length === 0 ? (
            <p className="text-sm text-slate-500">
              None uploaded yet — machine scoring still uses the built-in equipment catalog until you add your own.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Process type</th>
                  <th className="pb-2">Specs</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 font-medium text-slate-700">{e.name}</td>
                    <td className="py-2 text-slate-500">{e.process_type}</td>
                    <td className="py-2 text-xs text-slate-400">{JSON.stringify(e.specs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card card-pad">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Uploaded materials ({materials.length})</h2>
          {materials.length === 0 ? (
            <p className="text-sm text-slate-500">None uploaded yet — component entry still uses the built-in material catalog.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="pb-2">Grade</th>
                  <th className="pb-2">Family</th>
                  <th className="pb-2">Tensile (MPa)</th>
                  <th className="pb-2">Lead time (days)</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 font-medium text-slate-700">{m.grade_name}</td>
                    <td className="py-2 text-slate-500">{m.family ?? "—"}</td>
                    <td className="py-2 text-slate-500">{m.tensile_strength_mpa ?? "—"}</td>
                    <td className="py-2 text-slate-500">{m.typical_lead_time_days ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
