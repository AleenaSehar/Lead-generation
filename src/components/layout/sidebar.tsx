"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLeads } from "@/components/leads/lead-provider";

const workspaceLinks = [
  { href: "/", icon: "⌂", label: "Overview" },
  { href: "/leads", icon: "◎", label: "Leads" },
  { href: "/automations", icon: "↯", label: "Automations" },
  { href: "/campaigns", icon: "◈", label: "Campaigns" },
];

const manageLinks = [
  { href: "/integrations", icon: "⌘", label: "Integrations" },
  { href: "/settings", icon: "⚙", label: "Settings" },
];

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const pathname = usePathname();
  const { leads } = useLeads();

  const renderLink = (item: (typeof workspaceLinks)[number]) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={onNavigate}
      className={`nav-item ${pathname === item.href ? "active" : ""}`}
    >
      <span className="nav-icon" aria-hidden="true">{item.icon}</span>
      {item.label}
      {item.href === "/leads" && <b>{leads.length}</b>}
    </Link>
  );

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <Link className="brand" href="/" onClick={onNavigate} aria-label="LeadFlow home">
        <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
        <span>LeadFlow</span>
      </Link>
      <nav aria-label="Primary navigation">
        <p className="nav-label">Workspace</p>
        {workspaceLinks.map(renderLink)}
        <p className="nav-label">Manage</p>
        {manageLinks.map(renderLink)}
      </nav>
      <div className="sidebar-card">
        <span className="spark">✦</span>
        <strong>Starter plan</strong>
        <p>142 of 500 leads used</p>
        <div className="progress"><i /></div>
        <button type="button">View usage</button>
      </div>
      <div className="profile">
        <span className="avatar">AS</span>
        <div><strong>Aleena Sehar</strong><small>Workspace owner</small></div>
        <button type="button" aria-label="Profile options">•••</button>
      </div>
    </aside>
  );
}
