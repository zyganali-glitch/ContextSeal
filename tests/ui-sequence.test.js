import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("judge UI cannot render the approved fixture before the approval action", async () => {
  const [app, proofDashboard, html] = await Promise.all([
    readFile("public/app.js", "utf8"),
    readFile("public/dashboard-proof.js", "utf8"),
    readFile("public/index.html", "utf8")
  ]);

  assert.doesNotMatch(app, /staticDemo\?\.approved/);
  assert.doesNotMatch(app, /renderHeroSnapshot\(demo\.analyzed,\s*demo\.approved\)/);
  assert.doesNotMatch(app, /renderInheritanceLoop\(demo\.analyzed,\s*demo\.approved\)/);
  assert.match(app, /renderHeroSnapshot\(run\);/);
  assert.match(app, /renderInheritanceLoop\(run\);/);
  assert.match(app, /else renderPendingPassport\(\);/);
  assert.match(html, /aria-label="Certification snapshot summary"/);
  assert.match(html, /<h2>Certification snapshot<\/h2>/);
  assert.match(html, /A verified decision the next operator can inherit/);
  assert.match(html, /id="heroSnapshotState"[^>]*data-state="ANALYSIS_PENDING"[^>]*>ANALYSIS PENDING</);
  assert.match(html, /id="loopReadState"[^>]*data-state="NOT_RUN"[^>]*>NOT_RUN</);
  assert.match(html, /id="loopActState"[^>]*data-state="NOT_RUN"[^>]*>NOT_RUN</);
  assert.match(html, /id="loopWritebackState"[^>]*data-state="NOT_RUN"[^>]*>NOT_RUN</);
  assert.match(html, /id="loopInheritState"[^>]*data-state="PENDING"[^>]*>PENDING</);
  assert.match(html, /id="recordedProof"/);
  assert.match(html, /Recorded live-local proof/);
  assert.match(html, /Fixture replay powers this dashboard\./);
  assert.match(html, /id="agentTrace"/);
  assert.match(html, /id="artifacts"[^>]*role="tablist"[^>]*aria-orientation="vertical"/);
  assert.match(html, /id="artifactViewer"[^>]*role="tabpanel"[^>]*tabindex="0"/);
  assert.match(html, /id="artifactViewer"/);
  assert.match(html, /Approve safe scope/);
  assert.match(html, /Prepare write-back/);
  assert.match(app, /createProofDashboard/);
  assert.match(proofDashboard, /function renderRecordedProof\(proof\)/);
  assert.match(proofDashboard, /function renderAgentTrace\(run\)/);
  assert.match(proofDashboard, /function renderArtifactViewer\(file, run\)/);
  assert.match(proofDashboard, /aria-controls", "artifactViewer"/);
  assert.match(proofDashboard, /ArrowDown/);
  assert.match(proofDashboard, /navigator\.clipboard\?\.writeText/);
  assert.match(proofDashboard, /Receipt state/);
  assert.match(proofDashboard, /receipt\.action/);
  assert.doesNotMatch(proofDashboard, /innerHTML/);
});
