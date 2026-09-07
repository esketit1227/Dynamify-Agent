import Link from "next/link";
import { getLeadListView } from "@/lib/pipeline/lead-list";
import { StatusBadge, Card, EmptyState } from "@/components/ui";
import { RunPipelineButton } from "@/components/run-pipeline-button";

export const dynamic = "force-dynamic";

function scoreCell(value: number | null) {
  if (value === null) return <span className="text-ink-600">—</span>;
  const color = value >= 70 ? "text-emerald-400" : value >= 40 ? "text-amber-400" : "text-red-400";
  return <span className={`font-mono ${color}`}>{value}</span>;
}

export default async function LeadsPage() {
  const leads = await getLeadListView();

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink-50">Leads</h1>
          <p className="text-sm text-ink-400">
            {leads.length} lead{leads.length === 1 ? "" : "s"} — find businesses where
            Dynamify&apos;s personalization thesis is easy to demonstrate.
          </p>
        </div>
        <Link
          href="/leads/new"
          className="rounded-md bg-accent-600 px-3 py-2 text-sm font-medium text-white hover:bg-accent-500"
        >
          + New lead
        </Link>
      </div>

      <Card>
        {leads.length === 0 ? (
          <EmptyState>No leads yet. Create one to start the research pipeline.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-800 text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">ICP fit</th>
                  <th className="px-3 py-3 font-medium">Conversion</th>
                  <th className="px-3 py-3 font-medium">Personalization</th>
                  <th className="px-3 py-3 font-medium">Primary opportunity</th>
                  <th className="px-3 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-ink-800/60 last:border-0 hover:bg-ink-800/30">
                    <td className="px-5 py-3">
                      <Link href={`/leads/${lead.id}`} className="font-medium text-ink-50 hover:text-accent-400">
                        {lead.companyName}
                      </Link>
                      <div className="text-xs text-ink-500">{lead.domain}</div>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-3 py-3">{scoreCell(lead.fitScore)}</td>
                    <td className="px-3 py-3">{scoreCell(lead.conversionTotalScore)}</td>
                    <td className="px-3 py-3">{scoreCell(lead.personalizationPotentialScore)}</td>
                    <td className="max-w-[280px] px-3 py-3 truncate text-ink-300">
                      {lead.primaryOpportunityTitle ?? <span className="text-ink-600">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {lead.status === "new" ? (
                        <RunPipelineButton leadId={lead.id} />
                      ) : (
                        <Link href={`/leads/${lead.id}`} className="text-xs text-accent-400 hover:underline">
                          Review →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
