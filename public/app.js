const seedLeads = [
  { name: "Maya Chen", email: "maya@northstar.io", company: "Northstar Labs", score: 92, status: "Qualified", source: "Website", time: "2 min ago", color: "#dce8ff" },
  { name: "Oliver Brooks", email: "oliver@arcstone.co", company: "Arcstone", score: 84, status: "Qualified", source: "LinkedIn", time: "18 min ago", color: "#ffe5d7" },
  { name: "Sophia Patel", email: "sophia@lumenhq.com", company: "Lumen HQ", score: 76, status: "Contacted", source: "Referral", time: "43 min ago", color: "#dff5e8" },
  { name: "Noah Williams", email: "noah@verve.ai", company: "Verve AI", score: 68, status: "New", source: "Website", time: "1 hr ago", color: "#f1e1ff" },
  { name: "Emma Wilson", email: "emma@orbitworks.com", company: "Orbit Works", score: 88, status: "Qualified", source: "LinkedIn", time: "3 hrs ago", color: "#ffe3ee" },
  { name: "Liam Garcia", email: "liam@clearpath.dev", company: "Clearpath", score: 72, status: "Contacted", source: "Other", time: "Yesterday", color: "#e0f2f5" },
  { name: "Ava Martinez", email: "ava@daybreak.co", company: "Daybreak", score: 61, status: "New", source: "Referral", time: "Yesterday", color: "#fff0d7" },
  { name: "Ethan Kim", email: "ethan@basecamp.studio", company: "Basecamp Studio", score: 81, status: "Qualified", source: "Website", time: "2 days ago", color: "#e7e2ff" }
];

const workflows = [
  { icon: "✉", tone: "email", name: "Welcome sequence", description: "Send a three-step personalized introduction after a lead is captured.", sent: "128", rate: "46.2%", on: true },
  { icon: "✦", tone: "score", name: "Smart lead scoring", description: "Score leads using profile fit, source, and engagement signals.", sent: "1,284", rate: "30.1%", on: true },
  { icon: "♢", tone: "notify", name: "Hot lead alert", description: "Notify your sales team when a lead's score reaches 80 or higher.", sent: "16", rate: "8 min", on: true },
  { icon: "↻", tone: "email", name: "Re-engagement", description: "Reconnect with qualified leads who have been quiet for seven days.", sent: "34", rate: "21.4%", on: false }
];

let leads = JSON.parse(localStorage.getItem("leadflow-leads") || "null") || seedLeads;
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const initials = (name) => name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();

function renderRecent() {
  $("#recent-leads").innerHTML = leads.slice(0, 4).map((lead) => `
    <div class="lead-item">
      <span class="lead-avatar" style="background:${lead.color}">${initials(lead.name)}</span>
      <section><strong>${lead.name}</strong><small>${lead.company}</small></section>
      <span class="lead-score"><i style="background:${lead.score >= 80 ? "#25a678" : "#e9a449"}"></i>${lead.score}</span>
      <time>${lead.time}</time>
    </div>`).join("");
  $("#lead-count-badge").textContent = leads.length;
}

function renderTable() {
  const query = $("#lead-search").value.toLowerCase();
  const filter = $("#status-filter").value;
  const filtered = leads.filter((lead) =>
    (lead.name.toLowerCase().includes(query) || lead.company.toLowerCase().includes(query)) &&
    (filter === "all" || lead.status === filter)
  );
  $("#lead-table-body").innerHTML = filtered.map((lead) => `
    <div class="table-row">
      <span class="table-person"><i class="lead-avatar" style="background:${lead.color}">${initials(lead.name)}</i><span><strong>${lead.name}</strong><small>${lead.email}</small></span></span>
      <span>${lead.company}</span>
      <span class="score-pill">${lead.score}</span>
      <span class="status-pill status-${lead.status.toLowerCase()}">${lead.status}</span>
      <span>${lead.source}</span>
    </div>`).join("") || `<div style="padding:40px;text-align:center;color:#918e9d">No leads match your filters.</div>`;
}

function renderWorkflows() {
  $("#workflow-grid").innerHTML = workflows.map((flow, index) => `
    <article class="panel workflow-card">
      <header><span class="automation-icon ${flow.tone}">${flow.icon}</span><button class="toggle ${flow.on ? "on" : ""}" data-toggle="${index}" aria-label="Toggle ${flow.name}"><i></i></button></header>
      <h3>${flow.name}</h3><p>${flow.description}</p>
      <div class="workflow-stats"><div><span>PROCESSED</span><strong>${flow.sent}</strong></div><div><span>${flow.name === "Hot lead alert" ? "AVG. RESPONSE" : "SUCCESS RATE"}</span><strong>${flow.rate}</strong></div></div>
    </article>`).join("");
}

function switchView(view) {
  $$(".page").forEach((page) => page.classList.toggle("active", page.id === view));
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  $(".sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openModal() {
  $("#lead-modal").classList.add("open");
  $("#lead-modal").setAttribute("aria-hidden", "false");
  setTimeout(() => $("#lead-form input").focus(), 100);
}

function closeModal() {
  $("#lead-modal").classList.remove("open");
  $("#lead-modal").setAttribute("aria-hidden", "true");
}

$$(".nav-item").forEach((item) => item.addEventListener("click", () => switchView(item.dataset.view)));
$$("[data-view-link]").forEach((item) => item.addEventListener("click", () => switchView(item.dataset.viewLink)));
$("#add-lead-button").addEventListener("click", openModal);
$(".add-lead-secondary").addEventListener("click", openModal);
$(".modal-close").addEventListener("click", closeModal);
$("#lead-modal").addEventListener("click", (event) => { if (event.target === $("#lead-modal")) closeModal(); });
$(".mobile-menu").addEventListener("click", () => $(".sidebar").classList.toggle("open"));
$("#lead-search").addEventListener("input", renderTable);
$("#status-filter").addEventListener("change", renderTable);
$("#global-search").addEventListener("input", (event) => {
  if (event.target.value) {
    switchView("leads");
    $("#lead-search").value = event.target.value;
    renderTable();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    $("#global-search").focus();
  }
});

$("#lead-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const score = Math.floor(Math.random() * 31) + 65;
  leads.unshift({ ...data, score, status: score >= 80 ? "Qualified" : "New", time: "Just now", color: "#e7e2ff" });
  localStorage.setItem("leadflow-leads", JSON.stringify(leads));
  event.currentTarget.reset();
  closeModal();
  renderRecent();
  renderTable();
  $("#total-leads").textContent = (1284 + leads.length - seedLeads.length).toLocaleString();
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast").classList.remove("show"), 3200);
});

$("#workflow-grid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-toggle]");
  if (!button) return;
  const index = Number(button.dataset.toggle);
  workflows[index].on = !workflows[index].on;
  renderWorkflows();
});

renderRecent();
renderTable();
renderWorkflows();
