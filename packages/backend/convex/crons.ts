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

export default crons;
