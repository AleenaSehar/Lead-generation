"use client";
import { useState } from "react";
import { ScoringManager } from "@/components/scoring/scoring-manager";
import { SuppressionManager } from "@/components/settings/suppression-manager";

export function SettingsManager({ canManage }: { canManage: boolean }) {
  const [section, setSection] = useState<"scoring" | "suppression">("scoring");
  return <><nav className="settings-tabs" aria-label="Settings sections"><button className={section === "scoring" ? "active" : ""} onClick={() => setSection("scoring")}>Lead scoring</button><button className={section === "suppression" ? "active" : ""} onClick={() => setSection("suppression")}>Email safety</button></nav>{section === "scoring" ? <ScoringManager canManage={canManage} /> : <SuppressionManager canManage={canManage} />}</>;
}
