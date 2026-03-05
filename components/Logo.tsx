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
      {/* Circular logo */}
      <div className={`${s.circle} rounded-full overflow-hidden shadow-lg ring-2 ring-red-400/30 flex-shrink-0`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/3.jpeg" alt="Sorteos Jans" className="w-full h-full object-cover" />
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
