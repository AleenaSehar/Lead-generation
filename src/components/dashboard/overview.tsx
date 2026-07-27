"use client";

import Link from "next/link";
import { useLeads } from "@/components/leads/lead-provider";
import { MetricCard } from "@/components/dashboard/metric-card";
import { getInitials } from "@/lib/leads";

export function Overview() {
  const { leads } = useLeads();
  const totalLeads = 1284 + leads.length - 8;

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MONDAY, JULY 27</p>
          <h1>Good afternoon, Aleena <span>👋</span></h1>
          <p>Here’s how your lead engine is performing today.</p>
        </div>
        <div className="date-filter"><span>◷</span> Last 30 days <b>⌄</b></div>
      </div>

      <div className="metrics">
        <MetricCard icon="◎" tone="purple" label="Total leads" value={totalLeads.toLocaleString()} change="12.4%" detail="vs. 1,142 last month" />
        <MetricCard icon="✓" tone="green" label="Qualified leads" value="386" change="8.2%" detail="30.1% qualification rate" />
        <MetricCard icon="✦" tone="orange" label="Conversion rate" value="18.6%" change="3.1%" detail="Industry average: 12.4%" />
        <MetricCard icon="$" tone="blue" label="Pipeline value" value="$84.2k" change="18.7%" detail="Across 47 opportunities" />
      </div>

      <div className="dashboard-grid">
        <article className="panel performance-panel">
          <div className="panel-header">
            <div><h2>Lead performance</h2><p>New leads and qualified leads over time</p></div>
            <div className="legend"><span><i className="new" />New leads</span><span><i className="qualified" />Qualified</span></div>
          </div>
          <div className="chart">
            <div className="y-axis"><span>200</span><span>150</span><span>100</span><span>50</span><span>0</span></div>
            <div className="plot">
              <div className="grid-lines"><i /><i /><i /><i /><i /></div>
              <svg viewBox="0 0 700 210" preserveAspectRatio="none" role="img" aria-label="Lead performance chart">
                <defs>
                  <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7657f6" stopOpacity=".2" />
                    <stop offset="100%" stopColor="#7657f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path className="area" d="M0 170 C50 150 55 165 110 122 S180 138 230 95 S300 115 350 68 S430 90 480 50 S550 70 595 33 S650 55 700 15 L700 210 L0 210Z" />
                <path className="line-main" d="M0 170 C50 150 55 165 110 122 S180 138 230 95 S300 115 350 68 S430 90 480 50 S550 70 595 33 S650 55 700 15" />
                <path className="line-secondary" d="M0 190 C60 180 70 184 120 160 S190 175 245 140 S315 155 370 118 S450 135 500 103 S575 112 620 83 S665 92 700 66" />
              </svg>
              <div className="x-axis"><span>Jul 1</span><span>Jul 7</span><span>Jul 13</span><span>Jul 19</span><span>Jul 25</span></div>
            </div>
          </div>
        </article>

        <article className="panel source-panel">
          <div className="panel-header"><div><h2>Lead sources</h2><p>Where your leads come from</p></div><button type="button">•••</button></div>
          <div className="donut-wrap">
            <div className="donut"><span><strong>1,284</strong><small>Total leads</small></span></div>
            <ul>
              <li><i className="violet" /><span>Website</span><strong>42%</strong></li>
              <li><i className="cyan" /><span>LinkedIn</span><strong>26%</strong></li>
              <li><i className="yellow" /><span>Referral</span><strong>18%</strong></li>
              <li><i className="pink" /><span>Other</span><strong>14%</strong></li>
            </ul>
          </div>
        </article>

        <article className="panel recent-panel">
          <div className="panel-header">
            <div><h2>Recent leads</h2><p>Your latest captured prospects</p></div>
            <Link className="text-button" href="/leads">View all <span>→</span></Link>
          </div>
          <div className="lead-list">
            {leads.slice(0, 4).map((lead) => (
              <div className="lead-item" key={`${lead.email}-${lead.time}`}>
                <span className="lead-avatar" style={{ background: lead.color }}>{getInitials(lead.name)}</span>
                <section><strong>{lead.name}</strong><small>{lead.company}</small></section>
                <span className="lead-score"><i style={{ background: lead.score >= 80 ? "#25a678" : "#e9a449" }} />{lead.score}</span>
                <time>{lead.time}</time>
              </div>
            ))}
          </div>
        </article>

        <article className="panel automation-panel">
          <div className="panel-header">
            <div><h2>Active automations</h2><p>Workflows running right now</p></div>
            <Link className="text-button" href="/automations">Manage <span>→</span></Link>
          </div>
          <div className="automation-list">
            <div><span className="automation-icon email">✉</span><section><strong>Welcome sequence</strong><small>Trigger: New lead captured</small></section><em>Active</em><b>128 sent</b></div>
            <div><span className="automation-icon score">✦</span><section><strong>Lead scoring</strong><small>Trigger: Lead activity</small></section><em>Active</em><b>84 scored</b></div>
            <div><span className="automation-icon notify">♢</span><section><strong>Hot lead alert</strong><small>Trigger: Score above 80</small></section><em>Active</em><b>16 alerts</b></div>
          </div>
        </article>
      </div>
    </section>
  );
}
