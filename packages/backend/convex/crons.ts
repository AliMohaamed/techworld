import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Schedule a 24-hour routine (every 24 hours - expressed daily)
// This can be triggered more frequently in development if needed
crons.daily(
  "mark stalled orders",
  { hourUTC: 0, minuteUTC: 0 },
  internal.crons_internal.markStalledOrdersCron,
);

export default crons;
