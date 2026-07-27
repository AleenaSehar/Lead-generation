"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { seedLeads } from "@/data/leads";
import type { Lead, NewLead } from "@/types/lead";

const STORAGE_KEY = "leadflow-leads";

interface LeadContextValue {
  leads: Lead[];
  addLead: (lead: NewLead) => Lead;
  ready: boolean;
}

const LeadContext = createContext<LeadContextValue | null>(null);

export function LeadProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(seedLeads);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hydration = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) setLeads(JSON.parse(saved) as Lead[]);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setReady(true);
      }
    }, 0);
    return () => window.clearTimeout(hydration);
  }, []);

  const addLead = useCallback((newLead: NewLead) => {
    const score = Math.floor(Math.random() * 31) + 65;
    const lead: Lead = {
      ...newLead,
      score,
      status: score >= 80 ? "Qualified" : "New",
      time: "Just now",
      color: "#e7e2ff",
    };
    setLeads((current) => {
      const updated = [lead, ...current];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    return lead;
  }, []);

  const value = useMemo(() => ({ leads, addLead, ready }), [leads, addLead, ready]);
  return <LeadContext.Provider value={value}>{children}</LeadContext.Provider>;
}

export function useLeads() {
  const value = useContext(LeadContext);
  if (!value) throw new Error("useLeads must be used inside LeadProvider");
  return value;
}
