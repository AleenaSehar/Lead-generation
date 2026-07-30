"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AddLeadModal } from "@/components/leads/add-lead-modal";
import { Toast } from "@/components/shared/toast";
import { useLeads } from "@/components/leads/lead-provider";

export interface Viewer {
  name: string;
  email: string;
  imageUrl: string | null;
  workspaceName: string;
  role: string;
}

export function AppShell({ children, viewer }: { children: React.ReactNode; viewer: Viewer }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const { canCreate } = useLeads();

  function showLeadAdded() {
    setLeadModalOpen(false);
    setToastOpen(true);
    window.setTimeout(() => setToastOpen(false), 3200);
  }

  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} viewer={viewer} />
      <main>
        <Topbar
          onMenu={() => setMenuOpen((open) => !open)}
          onAddLead={() => setLeadModalOpen(true)}
          canAddLead={canCreate}
        />
        {children}
      </main>
      {canCreate && <AddLeadModal open={leadModalOpen} onClose={() => setLeadModalOpen(false)} onAdded={showLeadAdded} />}
      <Toast open={toastOpen} />
    </div>
  );
}
