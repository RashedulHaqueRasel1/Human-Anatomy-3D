"use client";

import { bnLabel, describe, infoFor, SYSTEMS_BY_ID, type BodyPart } from "@/lib/body";
import { t, tr, type Lang } from "@/lib/i18n";
import { Icon } from "../ui/icons";

/** Details of the selected structure, in the chosen language (with the other language underneath). */
export function InfoPanel({
  lang,
  part,
  actions,
  onClose,
}: {
  lang: Lang;
  part: BodyPart;
  actions?: React.ReactNode;
  onClose: () => void;
}) {
  const info = infoFor(part);
  const sys = SYSTEMS_BY_ID[part.system];
  const other = lang === "bn" ? "en" : "bn";
  return (
    <div className="fade-up">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider"
            style={{ background: sys.color + "26", color: sys.color }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: sys.color }} />
            {tr(lang, sys.name)}
          </span>
          <h2 className="mt-2 text-[17px] font-semibold leading-snug text-white">{part.name}</h2>
          <p className="text-[13px] text-slate-400">{bnLabel(part)}</p>
        </div>
        <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close">
          <Icon name="close" size={16} />
        </button>
      </div>
      <p className="mt-3 text-[13.5px] leading-relaxed text-slate-200">{describe(lang, info.description)}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{info.description[other]}</p>
      {info.functions && (
        <>
          <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{t(lang, "functions")}</h3>
          <ul className="mt-1.5 space-y-1.5 text-[13px] text-slate-300">
            {info.functions.map((f) => (
              <li key={f.en} className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-teal-400" />
                {describe(lang, f)}
              </li>
            ))}
          </ul>
        </>
      )}
      {info.clinical && (
        <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-3">
          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-300">
            <Icon name="surgery" size={13} /> {t(lang, "clinical")}
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-300">{describe(lang, info.clinical)}</p>
        </div>
      )}
      <p className="mt-3 text-[11px] text-slate-500">
        {t(lang, "size")} ≈ {part.size.map((v) => (v * 100).toFixed(1)).join(" × ")} cm
      </p>
      {actions && <div className="mt-3 grid grid-cols-3 gap-1.5 text-xs">{actions}</div>}
    </div>
  );
}
