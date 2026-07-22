import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("judge UI cannot render the approved fixture before the approval action", async () => {
  const [app, html] = await Promise.all([
    readFile("public/app.js", "utf8"),
    readFile("public/index.html", "utf8")
  ]);

  assert.doesNotMatch(app, /staticDemo\?\.approved/);
  assert.doesNotMatch(app, /renderHeroSnapshot\(demo\.analyzed,\s*demo\.approved\)/);
  assert.doesNotMatch(app, /renderInheritanceLoop\(demo\.analyzed,\s*demo\.approved\)/);
  assert.match(app, /renderHeroSnapshot\(run\);/);
  assert.match(app, /renderInheritanceLoop\(run\);/);
  assert.match(app, /else renderPendingPassport\(\);/);
  assert.match(html, /id="heroSnapshotState"[^>]*data-state="ANALYSIS_PENDING"[^>]*>ANALYSIS PENDING</);
  assert.match(html, /id="loopReadState"[^>]*data-state="NOT_RUN"[^>]*>NOT_RUN</);
  assert.match(html, /id="loopActState"[^>]*data-state="NOT_RUN"[^>]*>NOT_RUN</);
  assert.match(html, /id="loopWritebackState"[^>]*data-state="NOT_RUN"[^>]*>NOT_RUN</);
  assert.match(html, /id="loopInheritState"[^>]*data-state="PENDING"[^>]*>PENDING</);
});
