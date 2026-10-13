"use client";

import dynamic from "next/dynamic";

const SurgeryLab = dynamic(() => import("./SurgeryLab"), {
  ssr: false,
  loading: () => (
    <div className="grid h-dvh place-items-center bg-[#0b1418] text-sm text-slate-400">Loading Anatomy Lab…</div>
  ),
});

export default function LabClient() {
  return <SurgeryLab />;
}
