export function Header() {
  return (
    <header className="w-full border-b border-gray-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2.5 sm:py-3.5 flex items-center justify-between">
        
        {/* JANO Dragon Brand Logo */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-white p-0.5 border border-slate-200 shadow-2xs group-hover:scale-105 transition-all duration-300 flex-shrink-0">
            <img
              src="/images/jano_logo.png"
              alt="Jano HD Logo"
              className="w-full h-full object-contain"
            />
          </div>
          
          <div className="flex flex-col">
            <span className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight leading-none">
              Jano<span className="text-blue-600 font-black"> HD</span>
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono tracking-widest uppercase font-semibold mt-0.5">
              Studio
            </span>
          </div>
        </div>

        {/* Minimalist Nav Links */}
        <nav className="hidden lg:flex items-center space-x-8 text-sm font-medium text-slate-600">
          <a href="#" className="text-slate-900 font-semibold border-b-2 border-slate-900 pb-0.5">
            Overview
          </a>
          <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
            How It Works
          </a>
          <a href="#supported-sites" className="hover:text-slate-900 transition-colors">
            Supported Sites
          </a>
          <a href="#features" className="hover:text-slate-900 transition-colors">
            Features
          </a>
          <a href="#faq" className="hover:text-slate-900 transition-colors">
            FAQ
          </a>
        </nav>

        {/* Action Button */}
        <button
          type="button"
          className="btn-apple-dark text-xs sm:text-sm px-4 sm:px-5 py-1.5 sm:py-2"
        >
          Get Started
        </button>

      </div>
    </header>
  );
}
