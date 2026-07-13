import { Settings2 } from "lucide-react";

export default function MaintenancePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 text-center">
      <div className="relative mb-8">
        <div className="relative h-20 w-20 bg-card border border-border rounded-2xl flex items-center justify-center">
          <Settings2 size={40} className="text-primary animate-spin-slow" />
        </div>
      </div>

      <p className="text-[11px] uppercase tracking-[0.5em] text-primary mb-4">
        Offline for Upgrades
      </p>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6 max-w-xl">
        WE ARE FINE-TUNING THE EXPERIENCE
      </h1>
      <p className="max-w-md text-label-muted text-sm leading-7 font-light mb-10">
        Our systems are currently undergoing scheduled maintenance to improve
        performance and security. We will be back shortly with a smoother
        experience.
      </p>

      <div className="h-px w-20 bg-border mb-10" />

      <p className="text-[10px] text-label-muted/60 uppercase tracking-widest font-medium">
        TechWorld Operations Engine
      </p>
    </main>
  );
}