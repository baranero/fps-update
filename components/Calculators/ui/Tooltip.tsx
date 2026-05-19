import React from "react";

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

export default function Tooltip({ text, children }: TooltipProps) {
  return (
    <span className="group relative inline-flex cursor-help items-center border-b border-dashed border-slate-300 hover:border-primary dark:border-slate-600 pb-px transition-colors">
      {children}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-3 w-max max-w-xs sm:max-w-sm -translate-x-1/2 whitespace-normal rounded-xl bg-slate-900 px-4 py-3 text-left text-xs leading-relaxed text-white opacity-0 shadow-xl transition-all duration-200 group-hover:opacity-100 dark:bg-slate-100 dark:text-slate-900 translate-y-2 group-hover:translate-y-0 font-normal">
        {text}
        <div className="absolute top-full left-1/2 -ml-1.5 border-[6px] border-transparent border-t-slate-900 dark:border-t-slate-100"></div>
      </div>
    </span>
  );
}
