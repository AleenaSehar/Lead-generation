"use client";

import { useState } from "react";
import { initialWorkflows } from "@/data/workflows";
import { PageHeading } from "@/components/shared/page-heading";

export function AutomationManager() {
  const [workflows, setWorkflows] = useState(initialWorkflows);

  function toggle(index: number) {
    setWorkflows((current) => current.map((workflow, workflowIndex) =>
      workflowIndex === index ? { ...workflow, active: !workflow.active } : workflow
    ));
  }

  return (
    <section className="page">
      <PageHeading
        eyebrow="WORKFLOWS"
        title="Automations"
        description="Let your lead engine follow up while you focus on closing."
        action={<button className="primary-button" type="button">＋ New workflow</button>}
      />
      <div className="workflow-grid">
        {workflows.map((workflow, index) => (
          <article className="panel workflow-card" key={workflow.name}>
            <header>
              <span className={`automation-icon ${workflow.tone}`}>{workflow.icon}</span>
              <button
                className={`toggle ${workflow.active ? "on" : ""}`}
                type="button"
                onClick={() => toggle(index)}
                aria-label={`${workflow.active ? "Pause" : "Activate"} ${workflow.name}`}
                aria-pressed={workflow.active}
              ><i /></button>
            </header>
            <h3>{workflow.name}</h3>
            <p>{workflow.description}</p>
            <div className="workflow-stats">
              <div><span>PROCESSED</span><strong>{workflow.processed}</strong></div>
              <div><span>{workflow.performanceLabel.toUpperCase()}</span><strong>{workflow.performance}</strong></div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
