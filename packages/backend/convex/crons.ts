import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "mark stalled orders",
  { hourUTC: 0, minuteUTC: 0 },
  internal.crons_internal.markStalledOrdersCron,
);

crons.daily(
  "sweep orphaned catalog files",
  { hourUTC: 1, minuteUTC: 0 },
  internal.sweepJobs.sweepOrphanedCatalogFiles,
);

// Retries Meta Purchase events and sends any queued before the Conversions API
// token was configured. No-op while META_CAPI_ACCESS_TOKEN is unset.
crons.hourly(
  "flush meta conversions",
  { minuteUTC: 15 },
  internal.metaConversions.flushPendingEvents,
);

export default crons;
