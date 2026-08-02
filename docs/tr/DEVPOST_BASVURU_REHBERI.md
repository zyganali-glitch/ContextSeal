# Devpost Başvuru Rehberi — Tıklanacak Her Adımla

Bu rehber İngilizce bilmeyen ve daha önce Devpost başvurusu yapmamış bir kullanıcı için hazırlanmıştır. İngilizce metinleri değiştirmeden kopyalayıp belirtilen alanlara yapıştırabilirsin.

**Önemli:** Bu rehberde “gönder” denilen son bölüme ulaşana kadar başvuruyu yarışmaya gönderme. Önce taslak olarak kaydet.

## Başlamadan önce hazır olması gerekenler

Aşağıdakilerin tamamı hazır değilse başvuru formunu doldurabilirsin ama gönderme:

- [ ] GitHub deposu herkese açık.
- [ ] GitHub ana sayfasında Apache-2.0 lisansı görünüyor.
- [ ] README dosyası düzgün açılıyor.
- [ ] `npm run validate` geçiyor.
- [ ] Canlı gösterim bağlantısı hazır.
- [ ] YouTube videosu herkese açık ve üç dakikadan kısa.
- [ ] Video bağlantısı gizli pencerede açılıyor.
- [ ] Proje ekran görüntüsü hazır.
- [ ] Canlı DataHub kanıt durumu `docs/EVIDENCE_MANIFEST.md` ile aynı.
- [ ] Başvuruda kullanacağımız son metin Copilot tarafından kontrol edildi.

## 1. Devpost’a giriş

1. Chrome’u aç.
2. Adres çubuğuna şunu yaz:

   ```text
   https://datahub.devpost.com/
   ```

3. Sağ üstte **Log in** görürsen bas ve giriş yap.
4. Yarışmaya daha önce katılmadıysan **Join hackathon** düğmesine bas.
5. Giriş yaptıktan sonra yarışma sayfasına geri dön.

## 2. Yeni proje taslağı oluştur

Devpost ekranındaki yazılar küçük farklılık gösterebilir.

1. Üst menüde **My projects** seçeneğine bas.
2. **Start a project**, **Create project** veya **Add a new project** yazan düğmeyi bul.
3. Bu düğmeye bas.
4. Yarışma seçmen istenirse **Build with DataHub: The Agent Hackathon** seç.
5. Proje adını soran alana şunu yaz:

   ```text
   ContextSeal
   ```

6. Taslak oluşturma düğmesine bas.

## 3. Proje adı ve kısa açıklama

### Project name alanı

```text
ContextSeal
```

### Tagline veya Elevator pitch alanı

```text
Every data change ships with proof, not confidence.
```

Bu cümlenin Türkçe anlamı: “Her veri değişikliği güvenle değil, kanıtla yayınlanır.”

## 4. Yarışma kategorisi

“Which challenge category are you submitting to?” sorusunda şu seçeneği seç:

```text
Metadata-Aware Code Generation & Development
```

Bu ana kategoridir. Birden fazla seçenek seçilebiliyorsa ikincil uyum olarak ayrıca şunu seç:

```text
Agents That Do Real Work
```

Yalnız bir seçenek seçilebiliyorsa **Metadata-Aware Code Generation & Development** seç.

## 5. Kullanılan DataHub teknolojileri

“Which DataHub technologies did you use?” bölümünde gerçek son kanıta göre seç.

Seçilecekler:

- DataHub OSS / Core Platform
- DataHub MCP Server
- DataHub Skills

Agent Context Kit yalnız canlı uygulamada gerçekten kullanılmışsa seç. Sadece belgeyi okuduğumuz için seçme.

Analytics Agent kullanmadığımız için seçme.

## 6. Proje hikâyesi

Devpost genellikle hikâyeyi ayrı başlıklara böler. Aşağıdaki İngilizce metinleri karşılık gelen alanlara yapıştır.

### 30-second judge summary

```text
ContextSeal stops a breaking schema change before merge by turning DataHub context into a deterministic decision and an inspectable safe migration package. It shows the blocked request, exact fixture-backed downstream paths, generated dbt/model-test/rollback/owner artifacts, and a SHA-256 passport after scoped human approval. A bounded local AI layer explains the fixed verdict without changing it, while a separate recorded disposable-local DataHub proof demonstrates gated write-back and durable read-back on synthetic metadata.
```

### Inspiration

```text
AI coding agents can generate valid SQL and dbt code while missing the organizational context that makes a change safe. A repository does not reveal that a field feeds a dashboard three hops away, carries a PII term, or is owned by another team. DataHub holds that context, but a reviewer still needs a safe action, evidence, and an auditable decision. We built ContextSeal to turn DataHub context into a pre-merge certification boundary and a durable change passport.
```

### What it does

```text
In the 2:20 judge demo, ContextSeal blocks a risky rename, shows its deterministic blast radius and 12-step agent trace, inspects a bounded AI explanation and generated artifact viewer, records scoped approval, and ends on the passport plus a separately labeled recorded live-local proof.

ContextSeal accepts a proposed column rename, drop, or type change. Its deterministic core uses captured DataHub-shaped target, lineage, ownership, governance, quality, incident, and query context to reconstruct downstream paths and explain every risk finding. Instead of producing a destructive operation, it generates an expand-migrate-contract dbt model, schema tests, rollback, and owner briefing. The committed manifest links each generated file to the request, deterministic findings, downstream-owner context, migration rule, and passport context. A local deterministic sandbox checks that bundle against its hashes and grounding contract; it is a conformance proof, not warehouse SQL execution.

After the deterministic verdict is fixed, an optional local Ollama layer can turn the grounded run into a non-authoritative owner alert, migration rationale, reviewer-note draft, and next-step guidance. The AI receives structured grounded input, cannot alter risk or evidence states, and records NOT_ENABLED or UNAVAILABLE when the local runtime is absent instead of fabricating confidence.

A human reviewer approves or rejects only that bounded safe scope. ContextSeal then creates a SHA-256 change passport covering the request, context, risk, generated artifacts, evidence states, approval, and expiration. The default delivery path refreshes a reviewer-ready PR body, checklist, and payload without a GitHub token; an actual draft PR call is optional and token-gated. In approved live mode, with mutations explicitly enabled, ContextSeal writes certification properties, decision context, and the passport document back to DataHub so the next engineer or agent inherits the decision.
```

### How we built it

```text
ContextSeal has a deterministic Node.js core, a dual-transport DataHub MCP client for the official local stdio server and DataHub Cloud streamable HTTP, bounded multi-hop lineage traversal, a versioned policy engine, a dbt artifact generator, a human approval contract, a SHA-256 passport manifest, and an optional local Ollama adapter with bounded output contracts. DataHub is used for entity, lineage, ownership, governance, quality, incident, and query context, then enriched through structured properties, descriptions, and saved passport documents. The public judge path keeps its exact graph fixture-backed; separate disposable-local artifacts preserve raw MCP reads, bounded mutations, and post-write retrieval on synthetic metadata.
```

### Challenges we ran into

```text
The hardest design problem was separating a risky original request from a safe generated alternative. A direct rename can correctly receive a BLOCKED verdict while the staged migration remains eligible for scoped human approval. We also had to keep fixture, live, stale, and unexecuted evidence visibly distinct. During live verification, MCP transported a tool-level validation failure using isError; treating protocol delivery as business success would have created false evidence. We changed the client to fail closed on that signal and added a regression test before accepting any PASS.
```

### Accomplishments that we're proud of

```text
We built explainable fixture impact paths instead of a flat asset count, deterministic findings that model text cannot overwrite, a non-destructive migration package, a human approval bound to exact evidence hashes, inspectable grounded AI artifacts with honest fallback states, manifest-linked sandbox conformance, a reviewer-ready PR bundle, fail-closed DataHub mutations, and a reusable DataHub change-certification skill. A recorded disposable local DataHub proof retrieved ten live MCP reads across six downstream assets: two each of DATASET, DATA_JOB, and DASHBOARD. Its companion write-back export passed provenance-bound durable validation with three APPLIED operations, three skipped verify-then-skip retries, and exact-one checks on synthetic metadata.
```

### What we learned

```text
Context is most valuable when it changes an action, not when it only improves an answer. DataHub makes it possible to move agent safety from prompt instructions into a repeatable workflow grounded in organizational facts. Honest NOT_RUN, FIXTURE, and local-AI availability states make an agent more credible, not less impressive.
```

### What's next

```text
Next we will verify and contribute the change-certification skill upstream, add target-derived normalization for more DataHub entity types, add signed reviewer identities and replay protection, exercise the optional token-gated draft PR path after explicit approval, add warehouse-specific sandbox executors, and extend certification from column changes to dbt models and pipeline schedules.
```

## 7. Built with alanı

Etiket eklenen alanda aşağıdaki isimleri tek tek yaz. Her birinden sonra `Enter` tuşuna bas:

```text
DataHub
DataHub MCP Server
Node.js
Docker
dbt
GitHub Actions
Model Context Protocol
```

Sistemde çıkmayan etiketi zorla eklemeye çalışma.

## 8. GitHub bağlantısı

“Code repository”, “Repository URL” veya benzeri alana şunu yapıştır:

```text
https://github.com/zyganali-glitch/ContextSeal
```

Bağlantıya form içinden tıklayıp yeni sekmede açıldığını doğrula.

## 9. Canlı gösterim bağlantısı

“Try it out”, “Project URL” veya “Demo URL” alanına şu adresi yapıştır:

```text
https://zyganali-glitch.github.io/ContextSeal/
```

Geçici yerel adresi asla yazma:

```text
http://127.0.0.1:4173
```

Bu adres yalnız senin bilgisayarında çalışır; Devpost alanında yukarıdaki `github.io` adresi bulunmalıdır.

## 10. Video bağlantısı

“Demo video” alanına YouTube’daki herkese açık video bağlantısını yapıştır.

Örnek biçim:

```text
https://www.youtube.com/watch?v=...
```

Kontrol etmek için:

1. Bağlantıyı kopyala.
2. Chrome’un sağ üstündeki üç noktaya bas.
3. **Yeni gizli pencere** seçeneğine bas.
4. Bağlantıyı gizli pencerede aç.
5. Giriş yapmadan video oynuyorsa bağlantı uygundur.
6. Video üç dakikadan kısa olmalıdır.

## 11. Kapak görseli ve ekran görüntüleri

Ana görsel olarak şu görüntüyü kullan:

- ContextSeal ekranında risk puanı, lineage zinciri ve `BLOCKED` durumu birlikte görünmeli.
- Tarayıcı sekmeleri, yerel dosya yolu veya kişisel bilgiler görünmemeli.
- Görüntü bulanık olmamalı.

İkinci görsel:

- Onaydan sonra oluşan Change Passport.

Üçüncü görsel:

- DataHub içinde yazılmış ContextSeal alanları veya pasaport belgesi.

Canlı yerel DataHub kanıtı tamamlandı. Üçüncü görselde bunun sentetik verili yerel DataHub olduğunu açıklama metninde belirt.

## 12. Lisans kontrolü

1. GitHub deposunu aç.
2. Dosya listesinin sağ tarafında **Apache-2.0 license** veya benzeri ifade göründüğünü doğrula.
3. Görünmüyorsa `LICENSE` dosyasını aç ve doğru yüklendiğini kontrol et.
4. Devpost başvurusunu lisans görünmeden gönderme.

## 13. İsteğe bağlı örnek çıktılar

Devpost örnek çıktı bağlantısı kabul ediyorsa şu GitHub klasörünü kullan:

```text
https://github.com/zyganali-glitch/ContextSeal/tree/main/examples/outputs
```

Bu bağlantıyı yalnız klasör uzak repoda gerçekten görünüyorsa ekle.

## 14. Geri bildirim ödülü

Formda “Most Valuable Feedback” veya geri bildirim bölümü varsa katılmayı seçebilirsin. Geri bildirim gerçek olmalı.

Örnek başlıklar:

- MCP mutation araçlarının örnek parametrelerinin daha görünür olması,
- yerel Quickstart ile MCP sunucusu arasındaki bağlantının daha açık anlatılması,
- fixture ve canlı örnekler için ayrı uçtan uca rehber ihtiyacı.

Yaşamadığın bir sorunu yazma.

## 15. Son kontrol — henüz gönderme

Formu kaydet. **Submit** düğmesine basmadan önce şunları yap:

1. Başvurunun ön izlemesini aç.
2. Tüm bağlantılara tek tek bas.
3. GitHub bağlantısını gizli pencerede aç.
4. Canlı gösterimi gizli pencerede aç.
5. YouTube videosunu gizli pencerede oynat.
6. İngilizce metinlerde doldurulmamış bağlantı yer tutucusu kalmadığını ara.
7. Video ve başvuru iddialarını `docs/EVIDENCE_MANIFEST.md` ile karşılaştır.
8. Ekran görüntülerinde token veya kişisel bilgi olmadığını kontrol et.
9. Copilot’a başvuru ön izlemesinin ekran görüntülerini gönder.

## 16. Son gönderim

Copilot son kontrolü onayladıktan sonra:

1. Devpost taslağını aç.
2. En alttaki onay kutularını oku.
3. Kuralları kabul etmen istenirse kutuyu işaretle.
4. **Submit project** veya **Submit** düğmesine bir kez bas.
5. Başarılı gönderim sayfasının ekran görüntüsünü al.
6. Proje bağlantısını kopyala ve güvenli bir yere kaydet.

Başvuruyu mümkünse 8 veya 9 Ağustos’ta gönder; son dakikayı bekleme.
