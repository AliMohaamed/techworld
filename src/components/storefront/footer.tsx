import Link from "next/link";
import { Mail, Github, Twitter, Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black pt-16 pb-8 px-4 md:px-8">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand Info */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center space-x-1 outline-none">
              <div className="h-4 w-4 rounded-sm bg-[#ffc105]" />
              <span className="font-space-grotesk text-2xl font-black tracking-tighter text-white uppercase">
                TECH<span className="text-[#ffc105]">WORLD</span>
              </span>
            </Link>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
              Elevating your digital experience with premium, high-performance technology designed for the modern era.
            </p>
            <div className="flex items-center space-x-4">
              <Link href="#" className="h-10 w-10 rounded-full border border-white/5 flex items-center justify-center text-zinc-400 hover:text-[#ffc105] hover:border-[#ffc105] transition-all">
                <Github size={18} />
              </Link>
              <Link href="#" className="h-10 w-10 rounded-full border border-white/5 flex items-center justify-center text-zinc-400 hover:text-[#ffc105] hover:border-[#ffc105] transition-all">
                <Twitter size={18} />
              </Link>
              <Link href="#" className="h-10 w-10 rounded-full border border-white/5 flex items-center justify-center text-zinc-400 hover:text-[#ffc105] hover:border-[#ffc105] transition-all">
                <Instagram size={18} />
              </Link>
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="font-space-grotesk text-white font-bold uppercase tracking-widest text-sm mb-6">Explore</h4>
            <ul className="space-y-4">
              {["New Releases", "Best Sellers", "Gift Cards", "Tech Guide"].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-zinc-500 text-sm hover:text-[#ffc105] transition-colors">{item}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-space-grotesk text-white font-bold uppercase tracking-widest text-sm mb-6">Support</h4>
            <ul className="space-y-4">
              {["Shipping Info", "Returns & Refunds", "Order Tracking", "Help Center"].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-zinc-500 text-sm hover:text-[#ffc105] transition-colors">{item}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-6">
            <h4 className="font-space-grotesk text-white font-bold uppercase tracking-widest text-sm mb-6">Newsletter</h4>
            <p className="text-zinc-500 text-sm">Stay updated with the latest tech drops.</p>
            <div className="relative group">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#ffc105] transition-all pr-12"
              />
              <button className="absolute right-2 top-1.5 h-8 w-8 bg-[#ffc105] rounded-lg flex items-center justify-center text-black hover:bg-[#e6ae00] transition-colors">
                <Mail size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-zinc-600 text-xs text-center md:text-left">
            © 2024 TECHWORLD Inc. All rights reserved.
          </p>
          <div className="flex items-center space-x-8">
            {["Privacy Policy", "Terms of Service", "Cookie Settings"].map((item) => (
              <Link key={item} href="#" className="text-zinc-600 text-xs hover:text-zinc-400 transition-colors">{item}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
