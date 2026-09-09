"use client";

import { useState, useTransition } from "react";
import { removeCompanyMemberAction, updateMemberRoleAction } from "@/app/actions";
import { ROLES, ROLE_LABELS } from "@/lib/rbac";
import { CompanyMember, Role } from "@/lib/types";

export default function TeamMemberRow({ member, isSelf }: { member: CompanyMember; isSelf: boolean }) {
  const [role, setRole] = useState<Role>(member.role);
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-2 pr-4 text-sm text-slate-700">
        {member.invited_email ?? member.user_id}
        {isSelf && <span className="ml-2 text-xs text-slate-400">(you)</span>}
      </td>
      <td className="py-2 pr-4">
        <span className={`badge ${member.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
          {member.status}
        </span>
      </td>
      <td className="py-2 pr-4">
        <select
          className="input py-1 text-sm"
          value={role}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.value as Role;
            setRole(next);
            startTransition(() => {
              updateMemberRoleAction(member.id, next);
            });
          }}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2 text-right">
        <button
          type="button"
          disabled={pending || isSelf}
          className="text-xs font-medium text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:text-slate-300"
          onClick={() => startTransition(() => removeCompanyMemberAction(member.id))}
        >
          Remove
        </button>
      </td>
    </tr>
  );
}
