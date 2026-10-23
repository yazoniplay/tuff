(() => {
  "use strict";
  const REPO = "yazoniplay/tuff";
  const API = "https://api.github.com";
  const $ = (id) => document.getElementById(id);
  const labelsOf = (issue) => (issue.labels || []).map((label) => typeof label === "string" ? label : label.name);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let issues = [];
  let currentView = "overview";

  async function getJson(url) {
    const response = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
    if (!response.ok) throw new Error(response.status === 403 ? "GitHub API rate limit reached. Try again shortly." : `GitHub API returned ${response.status}.`);
    return response.json();
  }

  function issueRow(issue) {
    const labels = labelsOf(issue);
    const symbol = labels.includes("approved") ? "✓" : labels.includes("content-draft") ? "✎" : "⌕";
    const pills = labels.slice(0, 3).map((label) => `<span class="pill ${label === "approved" ? "approved" : label === "needs-review" ? "review" : ""}">${esc(label)}</span>`).join("");
    const date = new Date(issue.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `<article class="issue-row"><div class="issue-symbol">${symbol}</div><div class="issue-info"><a class="issue-title" href="${esc(issue.html_url)}" target="_blank" rel="noreferrer">${esc(issue.title)}</a><div class="issue-meta">#${issue.number} · Updated ${date}</div>${pills}</div></article>`;
  }

  function updateOverview() {
    const open = issues.filter((i) => i.state === "open");
    const drafts = open.filter((i) => labelsOf(i).includes("content-draft"));
    const approved = drafts.filter((i) => labelsOf(i).includes("approved"));
    const review = drafts.filter((i) => !labelsOf(i).includes("approved"));
    $("stat-drafts").textContent = review.length;
    $("stat-approved").textContent = approved.length;
    $("stat-tasks").textContent = open.length;
    $("approval-count").textContent = review.length;
    $("stat-research").textContent = issues.filter((i) => /research/i.test(i.title)).length;
    $("research-count").textContent = issues.filter((i) => /research/i.test(i.title)).length;
    $("recent-issues").innerHTML = issues.length ? issues.slice(0, 6).map(issueRow).join("") : '<div class="empty-state">No issues yet. Run research or create your first content draft.</div>';
  }

  function header(title, subtitle) {
    $("crumb").textContent = title;
    $("page-title").textContent = title;
    $("page-subtitle").textContent = subtitle;
    document.title = `${title} — Tuff`;
  }

  function viewContent(view) {
    currentView = view;
    document.querySelectorAll(".nav-item[data-view]").forEach((a) => a.classList.toggle("active", a.dataset.view === view));
    const container = $("view-content");
    const allDrafts = issues.filter((i) => labelsOf(i).includes("content-draft"));
    const awaiting = allDrafts.filter((i) => i.state === "open" && !labelsOf(i).includes("approved"));
    if (view === "overview") {
      header("Good work starts here.", "Your social media operation, in one place.");
      $("page-title").textContent = "Good work starts here.";
      $("page-subtitle").textContent = "Your social media operation, in one place.";
      container.innerHTML = overviewMarkup;
      updateOverview();
      return;
    }
    const views = {
      research: { title: "Research", subtitle: "Discover topics and inspect source material.", html: `<section class="view-panel"><h2>Research pipeline</h2><p>Research currently runs through GitHub Actions and collects configured RSS/Atom sources. Run the workflow to refresh the research report.</p><div class="view-actions"><a class="button primary" href="https://github.com/${REPO}/actions/workflows/daily-research.yml" target="_blank" rel="noreferrer">Run daily research ↗</a><a class="button secondary" href="https://github.com/${REPO}/issues?q=is%3Aissue+research" target="_blank" rel="noreferrer">Research issues ↗</a></div></section><section class="view-panel"><h2>Recent research issues</h2><div class="view-list">${issues.filter(i => /research/i.test(i.title)).map(i => `<div class="view-item"><b><a target="_blank" rel="noreferrer" href="${esc(i.html_url)}">${esc(i.title)} ↗</a></b><p>${esc(i.body || "").slice(0,240)}</p></div>`).join("") || '<p class="helper">No research issues found yet. The scheduled workflow must be enabled and run at least once.</p>'}</div></section>` },
      studio: { title: "Content studio", subtitle: "Shape ideas into content worth publishing.", html: `<section class="view-panel"><h2>Create a content draft</h2><p>Gemini runs securely in GitHub Actions. This static website never receives your API key. Use the draft workflow to generate content, then review it as a GitHub Issue.</p><div class="field"><label for="topic">Topic or idea</label><textarea id="topic" placeholder="e.g. 3 Minecraft building mistakes beginners can fix today"></textarea></div><div class="field"><label for="platform">Target platform</label><select id="platform"><option>TikTok</option><option>YouTube Shorts</option><option>Instagram Reels</option><option>X / Twitter</option><option>Multi-platform</option></select></div><div class="view-actions"><button class="button primary" id="make-draft">Prepare draft request ↗</button><a class="button secondary" href="https://github.com/${REPO}/issues/new?template=content-draft.yml" target="_blank" rel="noreferrer">Open draft form ↗</a></div><p class="helper" id="studio-help">The request opens GitHub so you can submit the idea. Gemini generation requires the repository workflow and secret to be configured.</p></section><section class="view-panel"><h2>Recent content drafts</h2><div class="view-list">${allDrafts.slice(0,8).map(i=>`<div class="view-item"><b><a href="${esc(i.html_url)}" target="_blank" rel="noreferrer">${esc(i.title)} ↗</a></b><p>${labelsOf(i).map(esc).join(" · ")}</p></div>`).join("") || '<p class="helper">Your generated drafts will appear here after the workflow creates GitHub Issues.</p>'}</div></section>` },
      approvals: { title: "Approvals", subtitle: "Human review is required before distribution.", html: `<section class="view-panel"><h2>Waiting for review <span class="pill review">${awaiting.length} pending</span></h2><p>Check factual claims, source URLs, brand voice, media rights, and platform formatting. Open each issue and apply the <b>approved</b> label only when it is ready.</p><div class="view-list">${awaiting.map(i=>`<div class="view-item"><b><a href="${esc(i.html_url)}" target="_blank" rel="noreferrer">${esc(i.title)} ↗</a></b><p>Issue #${i.number} · ${labelsOf(i).map(esc).join(" · ")}</p></div>`).join("") || '<p class="helper">No content drafts are waiting for approval.</p>'}</div><div class="view-actions"><a class="button secondary" href="https://github.com/${REPO}/issues?q=is%3Aissue+is%3Aopen+label%3Acontent-draft" target="_blank" rel="noreferrer">Manage approvals in GitHub ↗</a></div></section>` },
      analytics: { title: "Analytics", subtitle: "Understand what is working and what needs iteration.", html: `<section class="view-panel"><h2>Performance reports</h2><p>Live social metrics are not available until platform-specific APIs and account authorization are configured. Tuff will not fabricate impressions, views, or engagement.</p><div class="view-actions"><a class="button primary" href="https://github.com/${REPO}/tree/main/reports" target="_blank" rel="noreferrer">Open reports folder ↗</a><a class="button secondary" href="https://github.com/${REPO}/actions" target="_blank" rel="noreferrer">Workflow runs ↗</a></div></section><section class="view-panel"><h2>Issue pipeline snapshot</h2><div class="settings-grid"><div class="view-item"><b>${allDrafts.length}</b><p>Total content drafts found</p></div><div class="view-item"><b>${allDrafts.filter(i=>labelsOf(i).includes("approved")).length}</b><p>Approved drafts</p></div></div></section>` },
      knowledge: { title: "Brand knowledge", subtitle: "Give your agents context they can use consistently.", html: `<section class="view-panel"><h2>Knowledge base</h2><p>Edit these Markdown files in GitHub. Gemini reads them from the repository during workflow execution.</p><div class="view-list"><a class="settings-link" target="_blank" rel="noreferrer" href="https://github.com/${REPO}/edit/main/knowledge/brand_voice.md">Brand voice <span>Edit ↗</span></a><a class="settings-link" target="_blank" rel="noreferrer" href="https://github.com/${REPO}/edit/main/knowledge/audience.md">Target audience <span>Edit ↗</span></a><a class="settings-link" target="_blank" rel="noreferrer" href="https://github.com/${REPO}/edit/main/knowledge/topics.md">Topic list <span>Edit ↗</span></a><a class="settings-link" target="_blank" rel="noreferrer" href="https://github.com/${REPO}/edit/main/knowledge/templates/short_video.md">Short-video template <span>Edit ↗</span></a></div></section>` },
      settings: { title: "Settings", subtitle: "Configure the engine without exposing credentials.", html: `<section class="view-panel"><h2>Repository setup</h2><p>Configure secrets and Actions permissions in GitHub. Never paste an API key into this website.</p><div class="settings-grid"><a class="settings-link" href="https://github.com/${REPO}/settings/secrets/actions" target="_blank" rel="noreferrer">Actions secrets <span>Open ↗</span></a><a class="settings-link" href="https://github.com/${REPO}/settings/variables/actions" target="_blank" rel="noreferrer">Actions variables <span>Open ↗</span></a><a class="settings-link" href="https://github.com/${REPO}/actions" target="_blank" rel="noreferrer">Workflow runs <span>Open ↗</span></a><a class="settings-link" href="https://github.com/${REPO}/settings/pages" target="_blank" rel="noreferrer">GitHub Pages <span>Open ↗</span></a></div><div class="tip"><span>!</span><p><b>Gemini API key</b><br>Add <code>GEMINI_API_KEY</code> under Actions secrets. The dashboard is static and must never contain that secret.</p></div></section>` }
    };
    const selected = views[view] || views.overview;
    header(selected.title, selected.subtitle);
    container.innerHTML = selected.html;
    const make = $("make-draft");
    if (make) make.addEventListener("click", () => {
      const topic = $("topic").value.trim();
      const platform = $("platform").value;
      if (!topic) { $("studio-help").textContent = "Enter a topic first."; return; }
      const body = `**Topic:** ${topic}\n\n**Target platform:** ${platform}\n\n**Task for Tuff:** Use Gemini and the repository knowledge files to generate a hook, script/copy, caption, visual direction, and source links. Create a draft for human review only. Do not publish.\n\n- [ ] Claims fact-checked\n- [ ] Source links checked\n- [ ] Media rights checked\n- [ ] Brand voice checked\n- [ ] Ready for human approval`;
      const url = new URL(`https://github.com/${REPO}/issues/new`);
      url.searchParams.set("title", `Content draft — ${topic.slice(0,80)}`);
      url.searchParams.set("labels", "content-draft,needs-review");
      url.searchParams.set("body", body);
      window.open(url.toString(), "_blank", "noopener,noreferrer");
      $("studio-help").textContent = "Draft request prepared in GitHub. Submit the Issue there; generation runs only if the Gemini workflow is configured.";
    });
  }

  const overviewMarkup = $("view-content").innerHTML;
  async function refresh() {
    $("refresh-btn")?.classList.add("is-loading");
    try {
      issues = await getJson(`${API}/repos/${REPO}/issues?state=all&per_page=100&sort=updated&direction=desc`);
      issues = issues.filter((issue) => !issue.pull_request);
      updateOverview();
      if (currentView !== "overview") viewContent(currentView);
    } catch (error) {
      $("recent-issues").innerHTML = `<div class="error-state">${esc(error.message)}<br>Check repository visibility or open the Issues page directly.</div>`;
      ["stat-research","stat-drafts","stat-approved","stat-tasks"].forEach(id => $(id).textContent = "—");
    } finally { $("refresh-btn")?.classList.remove("is-loading"); }
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-view]");
    if (!link) return;
    const view = link.dataset.view;
    if (!view) return;
    event.preventDefault();
    history.replaceState(null, "", `#${view}`);
    viewContent(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  $("refresh-btn").addEventListener("click", refresh);
  $("dismiss-notice").addEventListener("click", () => $("connection-notice").remove());
  const startView = location.hash.slice(1);
  if (startView && startView !== "overview") viewContent(startView);
  refresh();
})();