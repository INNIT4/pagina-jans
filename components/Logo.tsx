interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

const SIZES = {
  sm: { circle: "w-8 h-8 text-sm", text: "text-lg" },
  md: { circle: "w-10 h-10 text-base", text: "text-xl" },
  lg: { circle: "w-16 h-16 text-2xl", text: "text-3xl" },
  xl: { circle: "w-28 h-28 text-4xl", text: "text-5xl" },
};

export default function Logo({ size = "md", showText = true }: LogoProps) {
  const s = SIZES[size];

  return (
    <div className="flex items-center gap-3">
      {/* Circular logo placeholder */}
      <div
        className={`${s.circle} rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center shadow-lg ring-2 ring-red-400/30 flex-shrink-0`}
      >
        <span className="font-black text-white tracking-tight leading-none">SJ</span>
      </div>

      {showText && (
        <div className="flex items-baseline gap-1 leading-none">
          <span className={`${s.text} font-black text-slate-700 dark:text-slate-200 tracking-tight`}>
            Sorteos
          </span>
          <span className={`${s.text} font-black text-red-600 dark:text-red-400 tracking-tight`}>
            Jans
          </span>
        </div>
      )}
    </div>
  );
}
