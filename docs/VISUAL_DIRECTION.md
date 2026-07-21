# ContextSeal Visual Direction

Updated: 2026-07-21 UTC

## Product posture

ContextSeal should look like a boardroom-grade certification console, not a hobby dashboard, hacker terminal, or generic SaaS landing page. The product is selling a compliance and approval boundary, so the interface needs to feel authoritative, deliberate, and expensive even though it runs with local-first tooling.

The first viewport must answer four judge questions immediately:

1. What risky change was blocked?
2. Why is it dangerous?
3. What safe package did ContextSeal generate instead?
4. What durable passport or inheritance outcome does approval unlock?

## Typography

- Use a local-first enterprise stack: `Aptos`, `Segoe UI Variable`, `Segoe UI`, `Helvetica Neue`, sans-serif.
- Use a tighter display stack for headlines and key product statements so the hero reads like a premium software surface rather than default documentation.
- Reserve monospace text for evidence states, hashes, passport IDs, workflow indices, and machine-facing metadata.
- Avoid playful display fonts, editorial serifs, or default system-only text that makes the app feel like a template.

## Color system

- Base canvas: deep obsidian and slate surfaces.
- Trust/action accent: cyan.
- Context accent: blue.
- Blocked/fail accent: red.
- Fixture, not-run, and caution accent: amber.
- Purple may remain a tertiary governance accent, but it must never become the dominant story color.

Color must stay semantic. Evidence states should be readable from color alone only as reinforcement, never as the sole cue; labels remain mandatory.

## Layout and hierarchy

- The hero is a split decision surface: narrative on the left, proof snapshot on the right.
- The first scroll band after the hero should clarify sequence, not add marketing filler.
- Workflow and inheritance strips should read like operational rails, not decorative dividers.
- The workspace panels should preserve a clear order of importance: blocked risk and safe package first, then AI explanation, then generated delivery, then approval and passport details.
- Dense evidence sections may feel technical, but spacing must keep them breathable and scannable.

## Surfaces and depth

- Prefer layered dark surfaces with subtle separation over flat monochrome blocks.
- Rounded corners should feel intentional and consistent, not soft or consumer-app friendly.
- Shadows should communicate hierarchy, not drama.
- Borders should do most of the structural work; glow stays restrained and attached to states that matter.

## Motion

- Motion should be minimal and functional.
- Default interactions: short hover lift, opacity easing, and scroll continuity.
- No decorative loops, loading gimmicks, or floating animations that compete with proof surfaces.
- Ambient background effects may stay, but they must remain secondary to the decision content.

## Data and proof presentation

- Passport IDs, hashes, and workflow counts should feel crisp and machine-credible.
- The blocked request, risk score, review file count, and inheritance outcome should be visible above the fold.
- Fixture versus live wording must stay explicit wherever a judge could otherwise infer unsupported live behavior.
- Any AI section must remain visually separated from deterministic evidence and clearly labeled as explanatory only.

## Responsive behavior

- Desktop should feel like a premium operations console.
- Tablet and mobile should collapse vertically without changing message order.
- The hero proof card, workflow strip, and inheritance strip must remain readable without sideways scrolling at common mobile widths.

## Implementation guardrails for W-16C and W-16D

- Extend the current CSS variable system instead of scattering one-off literal colors.
- Keep the first-minute judge path visually dominant.
- Do not introduce a new dependency just to change fonts or animation.
- Visual polish cannot blur the evidence boundary or weaken the distinction between fixture and live proof.