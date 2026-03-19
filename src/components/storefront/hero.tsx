import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-[85vh] flex items-center pt-20 overflow-hidden bg-black px-4 md:px-8">
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ffc105]/10 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-zinc-800/20 rounded-full blur-[100px] -z-10" />

      <div className="container mx-auto">
        <div className="max-w-4xl space-y-10">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[#ffc105] animate-ping" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Next Gen Audio Available Now</span>
            </div>
            <h1 className="font-space-grotesk text-5xl md:text-6xl lg:text-7xl font-black tracking-tightest leading-[0.9] text-white uppercase">
              Elevate Your <span className="text-[#ffc105]">Tech</span> Lifestyle
            </h1>
            <p className="max-w-2xl text-base md:text-lg text-zinc-400 leading-relaxed">
              Discover the latest smartwatches, premium audio, and smart gadgets.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Link 
              href="#featured" 
              className="group h-16 px-10 bg-[#ffc105] text-black font-space-grotesk font-black text-lg uppercase tracking-widest rounded-2xl flex items-center justify-center hover:bg-[#e6ae00] hover:scale-105 active:scale-95 transition-all w-full sm:w-auto"
            >
              Shop Now
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
            </Link>
          </div>

          {/* Stats/Badges */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 pt-10">
            {[
              { label: "Precision Engineering", value: "24-bit" },
              { label: "Active Noise Cancellation", value: "98%" },
              { label: "Wireless Latency", value: "<15ms" },
              { label: "Battery Performance", value: "48H" }
            ].map((stat) => (
              <div key={stat.label} className="space-y-1">
                <div className="text-2xl font-black text-white font-space-grotesk tracking-tighter uppercase">{stat.value}</div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
