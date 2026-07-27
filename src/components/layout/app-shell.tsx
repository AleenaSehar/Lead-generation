"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AddLeadModal } from "@/components/leads/add-lead-modal";
import { Toast } from "@/components/shared/toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  function showLeadAdded() {
    setLeadModalOpen(false);
    setToastOpen(true);
    window.setTimeout(() => setToastOpen(false), 3200);
  }

  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <main>
        <Topbar onMenu={() => setMenuOpen((open) => !open)} onAddLead={() => setLeadModalOpen(true)} />
        {children}
      </main>
      <AddLeadModal open={leadModalOpen} onClose={() => setLeadModalOpen(false)} onAdded={showLeadAdded} />
      <Toast open={toastOpen} />
    </div>
  );
}
