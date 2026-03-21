import { Settings2 } from "lucide-react";

export default function MaintenancePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#1a1814] text-white p-6 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 blur-3xl bg-[#ffc105]/20 rounded-full" />
        <div className="relative h-20 w-20 bg-[#24201a] border border-white/10 rounded-3xl flex items-center justify-center  ">
          <Settings2 size={40} className="text-[#ffc105] animate-spin-slow" />
        </div>
      </div>

      <p className="text-[11px] uppercase tracking-[0.5em] text-[#ffc105] mb-4">
        Offline for Upgrades
      </p>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6 max-w-xl">
        WE'RE FINE-TUNING THE EXPERIENCE
      </h1>
      <p className="max-w-md text-zinc-400 text-sm leading-7 font-light mb-10">
        Our systems are currently undergoing scheduled maintenance to improve
        performance and security. We'll be back shortly with a smoother
        experience.
      </p>

      <div className="h-px w-20 bg-white/10 mb-10" />

      <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium">
        TechWorld Operations Engine
      </p>
    </main>
  );
}
