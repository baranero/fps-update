import React from "react";
import Tooltip from "./Tooltip";

interface UnitInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  label?: string;
  unit?: string;
  tooltip?: string;
  value: string | number;
  onChange: (val: string) => void;
}

export default function UnitInput({ label, unit, tooltip, value, onChange, className, required, ...rest }: UnitInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(".", ",");
    if (/^[\d,]*$/.test(val)) {
      if ((val.match(/,/g) || []).length > 1) return;
      onChange(val);
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300 leading-snug">
          {tooltip ? <Tooltip text={tooltip}>{label}</Tooltip> : label}
          {required && <span className="text-primary ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          required={required}
          className={`w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-[#1E2342] dark:text-white dark:focus:border-primary input-with-unit ${className || ""}`}
          {...rest}
        />
        {unit && (
          <span className="input-unit-tag absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium pointer-events-none">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
