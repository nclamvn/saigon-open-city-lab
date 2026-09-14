# SCAN + design decision S06 UX

Existing static Three.js app, local Inter variable font, six data-mode buttons and engine-driven inspector/source slot. Baseline HTML/CSS copied into governance/baseline-s06 before changes. No framework, asset or external-font migration.

Issue: expanded narrative, wide bottom legend and 94%-opaque source panel consume map; mobile nav scroll hides some modes. Solution controls need event-driven readiness rather than UI-invented availability.

Design direction using Vibecode and frontend-design: the actual map remains the visual hero. Compact warm-neutral translucent navigation with deep botanical ink echoes the land/canopy context, without adding decorative map imagery. Palette: ink#17332f, muted#4f625c, glass-base#eff1e9, selected#214e45, water#3f9fd0, model-accent#b8842b. Local Inter for all Vietnamese text; 12–14px controls and 18–22px panel headings. Shared panel width344px/side16px, mobile safe8px. Glass blur10px limited to surfaces. No animated decorative overlays.

Layout: topbrand + six equal navigation cells; left compact mode title + Focus/Options; narrative and advanced choices expand only on request; right inspector/source drawer with shared width. Bottom compact persistent model/sample disclosure and Source/Help. Mobile six modes remain visible, drawers replace competing panels, large content scrolls inside bounded panel. Existing H/R/T/navigation preserved.

Reviewed against brief: Inter and glass are explicit requests; numbered mode markers hidden because six modes are peers, not a sequence. All active/disabled flags follow engine b04:solution-state; controls do not independently invent map state.
