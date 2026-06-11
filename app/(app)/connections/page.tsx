/**
 * /connections — the Integration Hub. Plan-gated to Pro+.
 *
 * Server assembles the honest hub state (registry × per-user rows ×
 * env-credential availability) and hands off to the client: status
 * dashboard, Integration Orbit, 3D cards, connect/manage/coming-soon
 * modals. Codeforces + GitHub imports are fully functional today;
 * Google/Facebook OAuth activates when server credentials exist.
 */

import { requirePlan } from "@/lib/authz";
import { hubState } from "@/lib/integrations/service";
import { ConnectionsClient, type HubEntryDto } from "@/components/app/ConnectionsClient";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  const user = await requirePlan("pro");
  const entries = (await hubState(user.id)) as HubEntryDto[];
  return <ConnectionsClient initial={entries} />;
}
