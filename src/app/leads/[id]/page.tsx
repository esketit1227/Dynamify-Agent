import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeadDetail } from "@/lib/pipeline/lead-detail";
import {
  Card,
  SectionHeading,
  StatusBadge,
  ConfidenceBadge,
  DetectabilityBadge,
  ScoreBar,
  BigScore,
  EmptyState,
} from "@/components/ui";
import { RunPipelineButton } from "@/components/run-pipeline-button";
import { OutreachPanel } from "@/components/lead/outreach-panel";
import { ReplyForm } from "@/components/lead/reply-form";
import { OutcomeForm } from "@/components/lead/outcome-form";
import { PreviewCompare } from "@/components/lead/preview-compare";

const STAGE_STATUS_DOT: Record<string, string> = {
  pending: "bg-ink-600",
  running: "bg-amber-400 animate-pulse",
  succeeded: "bg-emerald-400",
  failed: "bg-red-400",
  skipped: "bg-ink-600",
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getLeadDetail(id);
  if (!detail) notFound();

  const {
    lead,
    icp,
    websiteMap,
    pages,
    company,
    competitors,
    conversion,
    personalization,
    opportunities,
    previews,
    reports,
    outreach,
    replies,
    outcomes,
    runs,
    stageEvents,
  } = detail;

  const primaryOpportunity = opportunities.find((o) => o.isPrimary) ?? opportunities[0] ?? null;
  const latestPreview = previews[0] ?? null;
  const latestReport = reports[0] ?? null;
  const latestRun = runs[0] ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-ink-50">{lead.companyName}</h1>
            <StatusBadge status={lead.status} />
          </div>
          <a
            href={lead.homepageUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-ink-400 hover:text-accent-400"
          >
            {lead.domain}
          </a>
        </div>
        <RunPipelineButton
          leadId={lead.id}
          label={lead.status === "new" ? "Run pipeline" : "Re-run pipeline"}
        />
      </div>

      {latestRun && stageEvents.length > 0 && (
        <Card>
          <SectionHeading
            title="Pipeline run"
            subtitle={`Started ${new Date(latestRun.startedAt).toLocaleString()}${
              latestRun.finishedAt ? ` · finished ${new Date(latestRun.finishedAt).toLocaleString()}` : ""
            }`}
            right={<StatusBadge status={latestRun.status} />}
          />
          <div className="flex flex-wrap gap-2 p-5">
            {stageEvents.map((event) => (
              <div
                key={event.id}
                title={event.error ?? undefined}
                className="flex items-center gap-1.5 rounded-full border border-ink-800 bg-ink-950 px-2.5 py-1 text-[11px] text-ink-300"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${STAGE_STATUS_DOT[event.status]}`} />
                {event.stage.replace(/_/g, " ")}
              </div>
            ))}
          </div>
          {latestRun.error ? (
            <p className="border-t border-ink-800 px-5 py-3 text-xs text-red-400">{latestRun.error}</p>
          ) : null}
        </Card>
      )}

      {icp && (
        <Card>
          <SectionHeading
            title="ICP qualification"
            subtitle={icp.shouldAnalyze ? "Qualified for full research" : "Disqualified — pipeline stopped here"}
            right={<BigScore value={icp.fitScore} max={100} label="fit" />}
          />
          <div className="grid grid-cols-1 gap-4 p-5 text-sm md:grid-cols-2">
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Fit reasons
              </h3>
              <ul className="list-inside list-disc space-y-1 text-ink-300">
                {icp.fitReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Disqualifiers
              </h3>
              {icp.disqualifiers.length === 0 ? (
                <p className="text-ink-600">None identified.</p>
              ) : (
                <ul className="list-inside list-disc space-y-1 text-ink-300">
                  {icp.disqualifiers.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Business model
              </h3>
              <p className="text-ink-300">{icp.businessModel}</p>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Likely decision maker
              </h3>
              <p className="text-ink-300">{icp.likelyDecisionMaker}</p>
            </div>
          </div>
        </Card>
      )}

      {websiteMap && (
        <Card>
          <SectionHeading
            title="Website exploration"
            subtitle={`${websiteMap.pagesVisitedCount} of ${websiteMap.pageBudget} page budget visited${
              websiteMap.stoppedEarly ? " · stopped early" : ""
            }${websiteMap.stopReason ? ` — ${websiteMap.stopReason}` : ""}`}
          />
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((p) => (
              <a
                key={p.id}
                href={p.screenshotPath ?? p.url}
                target="_blank"
                rel="noreferrer"
                className="group overflow-hidden rounded-lg border border-ink-800 hover:border-accent-500"
              >
                {p.screenshotPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.screenshotPath} alt={p.title ?? p.url} className="h-32 w-full object-cover object-top" />
                ) : (
                  <div className="flex h-32 items-center justify-center bg-ink-950 text-xs text-ink-600">
                    No screenshot
                  </div>
                )}
                <div className="p-2">
                  <div className="truncate text-xs font-medium text-ink-200 group-hover:text-accent-400">
                    {p.title || p.url}
                  </div>
                  <div className="truncate text-[10px] text-ink-500">
                    {p.pageType.replace(/_/g, " ")}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </Card>
      )}

      {company && (
        <Card>
          <SectionHeading title="Company research" subtitle={company.positioning} />
          <div className="space-y-4 p-5 text-sm">
            <p className="text-ink-300">{company.summary}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Industries served
                </h3>
                <p className="text-ink-300">{company.industriesServed.join(", ") || "—"}</p>
              </div>
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Use cases
                </h3>
                <p className="text-ink-300">{company.useCases.join(", ") || "—"}</p>
              </div>
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Major offers
                </h3>
                <p className="text-ink-300">{company.majorOffers.join(", ") || "—"}</p>
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Sourced findings
              </h3>
              <ul className="space-y-2">
                {company.findings.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-md border border-ink-800 p-2">
                    <ConfidenceBadge confidence={f.confidence} />
                    <div className="min-w-0">
                      <p className="text-ink-200">{f.claim}</p>
                      {f.evidenceSnippet ? (
                        <p className="mt-0.5 text-xs italic text-ink-500">&ldquo;{f.evidenceSnippet}&rdquo;</p>
                      ) : null}
                      {f.sourceUrl ? (
                        <a
                          href={f.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-0.5 block truncate text-xs text-accent-400 hover:underline"
                        >
                          {f.sourceUrl}
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {competitors && competitors.competitors.length > 0 && (
        <Card>
          <SectionHeading title="Competitor research" subtitle="Context only — not a full landscape report" />
          <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2">
            {competitors.competitors.map((c, i) => (
              <div key={i} className="rounded-lg border border-ink-800 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink-100">{c.name}</h3>
                  <a href={c.url} target="_blank" rel="noreferrer" className="text-xs text-accent-400 hover:underline">
                    site
                  </a>
                </div>
                <p className="text-xs text-ink-400">{c.valueProposition}</p>
                <p className="mt-1 text-xs text-ink-500">
                  Personalization: <span className="text-ink-300">{c.personalization}</span>
                </p>
              </div>
            ))}
          </div>
          {competitors.gapsRelevantToDynamify.length > 0 && (
            <div className="border-t border-ink-800 p-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Gaps relevant to Dynamify
              </h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-ink-300">
                {competitors.gapsRelevantToDynamify.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {conversion && (
        <Card>
          <SectionHeading
            title="Conversion analysis"
            subtitle={conversion.targetUrl}
            right={<BigScore value={conversion.totalScore} max={100} label="score" />}
          />
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <div className="space-y-3">
              <ScoreBar label="Value proposition" value={conversion.valuePropositionScore} max={20} />
              <ScoreBar label="Audience clarity" value={conversion.audienceClarityScore} max={15} />
              <ScoreBar label="Proof" value={conversion.proofScore} max={15} />
              <ScoreBar label="CTA" value={conversion.ctaScore} max={10} />
              <ScoreBar label="Friction" value={conversion.frictionScore} max={15} />
              <ScoreBar label="Offer" value={conversion.offerScore} max={10} />
              <ScoreBar label="Message match" value={conversion.messageMatchScore} max={15} />
            </div>
            <div className="space-y-3 text-xs text-ink-300">
              <p>
                <span className="font-semibold text-ink-100">Value proposition — </span>
                {conversion.explanations.valueProposition}
              </p>
              <p>
                <span className="font-semibold text-ink-100">Audience clarity — </span>
                {conversion.explanations.audienceClarity}
              </p>
              <p>
                <span className="font-semibold text-ink-100">Proof — </span>
                {conversion.explanations.proof}
              </p>
              <p>
                <span className="font-semibold text-ink-100">CTA — </span>
                {conversion.explanations.cta}
              </p>
              <p>
                <span className="font-semibold text-ink-100">Friction — </span>
                {conversion.explanations.friction}
              </p>
              <p>
                <span className="font-semibold text-ink-100">Offer — </span>
                {conversion.explanations.offer}
              </p>
              <p>
                <span className="font-semibold text-ink-100">Message match — </span>
                {conversion.explanations.messageMatch}
              </p>
            </div>
          </div>
        </Card>
      )}

      {personalization && (
        <Card>
          <SectionHeading
            title="Personalization analysis"
            subtitle="How much this prospect's visitor base varies, and how detectable that variation would be"
            right={<BigScore value={personalization.personalizationPotentialScore} max={100} label="potential" />}
          />
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["Audience", personalization.audienceDiversity],
                ["Industry", personalization.industryDiversity],
                ["Use case", personalization.useCaseDiversity],
                ["Role", personalization.roleDiversity],
                ["Intent", personalization.intentDiversity],
                ["Geography", personalization.geographicDiversity],
                ["Product", personalization.productDiversity],
                ["Acquisition source", personalization.acquisitionSourceDiversity],
              ] as const
            ).map(([label, dim]) => (
              <div key={label} className="rounded-lg border border-ink-800 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink-200">{label}</span>
                  <span className={dim.present ? "text-emerald-400" : "text-ink-600"}>
                    {dim.present ? "Present" : "Not present"}
                  </span>
                </div>
                {dim.present && (
                  <ul className="list-inside list-disc space-y-0.5 text-[11px] text-ink-400">
                    {dim.evidence.slice(0, 3).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-ink-800 p-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
              Recommended segments
            </h3>
            <div className="space-y-2">
              {personalization.recommendedSegments.map((seg, i) => (
                <div key={i} className="rounded-md border border-ink-800 p-3 text-sm">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink-100">{seg.segment}</span>
                    <ConfidenceBadge confidence={seg.confidence} />
                    <DetectabilityBadge detectability={seg.detectability} />
                  </div>
                  <p className="text-xs text-ink-400">{seg.why.join(" · ")}</p>
                  <p className="mt-1 text-xs text-ink-500">
                    Dynamify mechanism: {seg.dynamifyMechanism.join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {opportunities.length > 0 && (
        <Card>
          <SectionHeading
            title="Opportunities"
            subtitle="Scout identifies several, then selects exactly one primary opportunity to build the demo around"
          />
          <div className="space-y-3 p-5">
            {opportunities.map((o) => (
              <div
                key={o.id}
                className={`rounded-lg border p-4 ${
                  o.isPrimary ? "border-accent-500 bg-accent-600/5" : "border-ink-800"
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {o.isPrimary && (
                    <span className="rounded-full bg-accent-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Primary
                    </span>
                  )}
                  <h3 className="text-sm font-semibold text-ink-100">{o.title}</h3>
                  <span className="text-xs text-ink-500">{o.type.replace(/_/g, " ")}</span>
                  <span className="ml-auto font-mono text-xs text-ink-400">
                    {o.compositeScore.toFixed(0)}/100
                  </span>
                </div>
                <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-ink-400">What&apos;s wrong</dt>
                    <dd className="text-ink-300">{o.whatIsWrong}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink-400">Why it matters</dt>
                    <dd className="text-ink-300">{o.whyItMatters}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink-400">Who&apos;s affected</dt>
                    <dd className="text-ink-300">{o.whoIsAffected}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink-400">What should change</dt>
                    <dd className="text-ink-300">{o.whatShouldChange}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink-400">Why personalization is the mechanism</dt>
                    <dd className="text-ink-300">{o.whyPersonalizationIsTheRightMechanism}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink-400">What Dynamify would do dynamically</dt>
                    <dd className="text-ink-300">{o.whatDynamifyWouldDoDynamically}</dd>
                  </div>
                </dl>
                {o.isPrimary && o.selectionRationale && (
                  <p className="mt-2 border-t border-ink-800 pt-2 text-xs italic text-ink-500">
                    Why this one: {o.selectionRationale}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {latestPreview && (
        <Card>
          <SectionHeading
            title="Preview"
            subtitle={latestPreview.targetPageUrl}
            right={<StatusBadge status={latestPreview.status} />}
          />
          <div className="p-5">
            <PreviewCompare
              beforeScreenshotPath={latestPreview.beforeScreenshotPath}
              afterScreenshotPath={latestPreview.afterScreenshotPath}
              beforeHtmlPath={latestPreview.beforeHtmlPath}
              afterHtmlPath={latestPreview.afterHtmlPath}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 border-t border-ink-800 p-5 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Changes made
              </h3>
              <ul className="space-y-2 text-xs">
                {latestPreview.changesSummary.map((c, i) => (
                  <li key={i} className="rounded border border-ink-800 p-2">
                    <span className="font-semibold text-ink-200">{c.section}: </span>
                    <span className="text-ink-300">{c.change}</span>
                    <p className="mt-0.5 italic text-ink-500">{c.rationale}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                QA checks
              </h3>
              <ul className="space-y-1.5 text-xs">
                {latestPreview.qaChecks.map((c) => (
                  <li key={c.id} className="flex items-start gap-2">
                    <span className={c.passed ? "text-emerald-400" : "text-red-400"}>
                      {c.passed ? "✓" : "✗"}
                    </span>
                    <div>
                      <span className="font-medium text-ink-200">{c.checkType.replace(/_/g, " ")}: </span>
                      <span className="text-ink-400">{c.notes}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {latestReport && (
        <Card>
          <SectionHeading title="Internal report" subtitle={latestReport.headline} />
          <div className="space-y-4 p-5 text-sm">
            <p className="text-ink-300">{latestReport.executiveSummary}</p>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Primary opportunity
                </h3>
                <p className="text-ink-300">{latestReport.sections.primaryOpportunity}</p>
              </div>
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Recommended next steps
                </h3>
                <p className="text-ink-300">{latestReport.sections.recommendedNextSteps}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {outreach.length > 0 && (
        <Card>
          <SectionHeading title="Outreach" subtitle="First-touch email — short, plain text, no links or attachments" />
          <div className="divide-y divide-ink-800">
            {outreach.map((draft) => (
              <OutreachPanel
                key={draft.id}
                leadId={lead.id}
                draft={{
                  id: draft.id,
                  subject: draft.subject,
                  bodyText: draft.bodyText,
                  editedBodyText: draft.editedBodyText,
                  status: draft.status,
                  recipientGuess: draft.recipientGuess,
                  approvedByEmail: draft.approvedByEmail,
                  approvedAt: draft.approvedAt,
                  sentAt: draft.sentAt,
                  rejectionReason: draft.rejectionReason,
                }}
              />
            ))}
          </div>
        </Card>
      )}

      <Card>
        <SectionHeading title="Replies" subtitle="Log inbound replies to track sentiment and next actions" />
        {replies.length === 0 ? <EmptyState>No replies logged yet.</EmptyState> : null}
        {replies.length > 0 && (
          <ul className="space-y-2 px-5 pt-5 text-sm">
            {replies.map((r) => (
              <li key={r.id} className="rounded-md border border-ink-800 p-3">
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <span className="rounded bg-ink-800 px-1.5 py-0.5 uppercase text-ink-300">{r.direction}</span>
                  <span className="text-ink-400">{r.sentiment.replace(/_/g, " ")}</span>
                  {r.wantsDemo && <span className="text-emerald-400">wants demo</span>}
                  <span className="ml-auto text-ink-600">{new Date(r.occurredAt).toLocaleString()}</span>
                </div>
                <p className="text-ink-300">{r.bodyText}</p>
                {r.nextAction && <p className="mt-1 text-xs italic text-ink-500">Next: {r.nextAction}</p>}
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-ink-800">
          <ReplyForm leadId={lead.id} />
        </div>
      </Card>

      <Card>
        <SectionHeading title="CRM outcomes" subtitle="Feeds the learning/evaluation dataset" />
        {outcomes.length === 0 ? <EmptyState>No outcomes logged yet.</EmptyState> : null}
        {outcomes.length > 0 && (
          <ul className="space-y-2 px-5 pt-5 text-sm">
            {outcomes.map((o) => (
              <li key={o.id} className="flex items-center justify-between rounded-md border border-ink-800 p-3">
                <div>
                  <span className="font-medium text-ink-200">{o.stage.replace(/_/g, " ")}</span>
                  {o.notes && <p className="text-xs text-ink-500">{o.notes}</p>}
                </div>
                <div className="text-right text-xs text-ink-500">
                  {o.dealValueUsd ? <div>${o.dealValueUsd.toLocaleString()}</div> : null}
                  <div>{new Date(o.occurredAt).toLocaleDateString()}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-ink-800">
          <OutcomeForm leadId={lead.id} />
        </div>
      </Card>

      <div className="pb-4 text-center">
        <Link href="/" className="text-xs text-ink-500 hover:text-ink-300">
          ← Back to all leads
        </Link>
      </div>
    </div>
  );
}
