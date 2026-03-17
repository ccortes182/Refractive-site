# Refractive Website Build — Claude Code Prompt

Copy and paste the sections below into Claude Code as your working prompt. Upload your exported Webflow site files alongside it.

---

## PROMPT START

You are helping me rebuild and complete the website for **Refractive**, a premium eCommerce growth agency. I've exported my current Webflow site and uploaded those files. The site is in rough shape — it was built from a template and has significant placeholder content, structural issues, and copy that doesn't match our positioning. Your job is to transform it into a polished, production-ready site that feels like a serious, well-funded agency — not a freelancer with a template.

---

### BRAND CONTEXT

**Company:** Refractive — a full-service eCommerce growth agency for emerging and mid-market DTC brands.

**Founder:** Christian Cortes — 8+ years in eCommerce marketing, previously Digital Marketing Manager at a $40M sporting goods retailer. Senior operator who does the work, not just manages it.

**Core positioning:** We replace your entire agency stack with one senior team and one coordinated growth system. One team. Every channel. No excuses.

**Brand metaphor:** Refraction — taking a brand's existing energy (light) and channeling it through a coordinated system into measurable, compounding growth across channels.

**Brand voice:** Bold, energetic, high-accountability, operator-led. Professional but not corporate. No fluff. Think confident founder energy, not agency-speak.

**Copy rules:**
- Never use em dashes in headlines or hero text
- "KANE" is always fully capitalized when referenced
- Avoid the phrase "sharp founders" (overused in drafts)
- Avoid generic agency language ("synergy," "leverage," "holistic")
- Write like a founder talking to another founder, not an agency pitching a prospect

**Visual identity:**
- Dark charcoal background (#2D2D3A or similar from existing site)
- White primary text
- Accent gradient: blue → violet/purple (used in logo, light refraction motif)
- Typography: clean, geometric sans-serif. Uppercase for section labels and eyebrow text
- Fine-line, geometric, minimal icons
- Premium, minimal aesthetic — think Stripe, Linear, Notion-level polish

---

### SITE STRUCTURE

Build the site with the following pages/sections. The homepage is the priority.

#### HOMEPAGE (single scroll page)

**1. Hero Section**
- Background: keep the existing dark video loop if present, or a subtle animated gradient
- Headline: "One growth team. Every channel. No excuses."
- Subhead: "Refractive replaces your agency stack with a single senior team that owns paid, creative, site, email, and measurement. All coordinated. All accountable. Growth that compounds."
- CTA button: "Book a Growth Audit" (link to #contact or Calendly)
- Small scrolling marquee or subtle badge below: "Senior-operator led" repeated

**2. Brand Logos Section**
- Eyebrow: "Partners in motion"
- Heading: "From spark to spotlight"
- Display client/brand logos with video hover states (preserve existing Webflow interactions if possible): KANE Footwear, Lax.com, Zima, Invasion, Captain Zig, Restore
- Keep the existing video-on-hover card layout — it's one of the strongest elements on the current site

**3. Mission / Value Prop Statement**
- "Harnessing the power of refraction to transform bold brands. We channel their light into unstoppable growth through clear strategy, creative that cuts through, and high-converting digital experiences."
- Keep this as a clean, centered text block with generous whitespace

**4. How We Work — The Refractive Growth Engine**
- Eyebrow: "How We Work"
- Heading: "Our Full-Spectrum Framework"
- Present as a sequential 4-step system (NOT a service menu). Each step gets a number, icon, title, and 2-3 sentence description with deliverables:

**Step 1: Foundation**
"Get the map before the miles. We define positioning, goals, channels, and a 90-day operating plan so every test ladders up to revenue."
Deliverables: Business strategy, positioning, GTM plan, creative angles, ops and integrations.

**Step 2: Growth**
"Acquire demand with precision. Full-funnel paid on Meta, Google/PMAX, TikTok, and LinkedIn, synced with creative and landing systems."
Deliverables: Paid social/search, creative production and iteration, marketplace management, analytics.

**Step 3: Conversion**
"Turn attention into revenue. Shopify engineering, CRO, SEO, and Performance UX to make the path to purchase obvious."
Deliverables: Shopify dev, CRO and A/B testing, SEO, AI-enhanced site search/reco, landing systems.

**Step 4: Retention**
"Compound LTV. Email and SMS, loyalty, subscriptions, and CX systems that keep customers and cash flow coming back."
Deliverables: Flows and campaigns, loyalty/referral, subscription optimization, CX tooling.

- Use the existing alternating layout (image left/right with content) if it's working. Keep the numbered step indicators.

**5. Tech Partners / Tools Section**
- Heading: "Built on tools you already trust"
- Subhead: "Own your data. Keep your stack. We make it talk."
- Keep the existing scrolling logo marquee (Shopify, Meta, Google, Klaviyo, Triple Whale, Northbeam, etc.)
- REMOVE the "No-code Tools" section entirely (Webflow, Memberstack, Airtable, Zapier, Figma, Photoshop, Illustrator, After Effects, Slack, Discord, CleanShot, Notion). This is from the template and doesn't match our positioning.

**6. Services Grid (simplified)**
- Eyebrow: "What we cover"
- 6-8 clean cards with icon + title + one-sentence description (no Lorem ipsum). Cards:
  - Business Strategy: "Positioning, GTM planning, and the strategic foundation everything else builds on."
  - Paid Media: "Full-funnel acquisition across Meta, Google, TikTok, and LinkedIn. Spend smarter, scale faster."
  - Creative Production: "Scroll-stopping creative built for performance. Concepts, production, and iteration at velocity."
  - Shopify Development: "Custom Shopify Plus builds, theme development, and performance engineering."
  - Email and SMS: "Lifecycle flows and campaigns via Klaviyo that turn one-time buyers into repeat customers."
  - CRO and Testing: "Data-driven conversion optimization. A/B testing, landing pages, and checkout improvements."
  - Data and Analytics: "Full-funnel dashboards, attribution, incrementality testing, and media mix modeling."
  - AI Enhancements: "LLM-optimized product discovery, AI-powered site search, and next-gen personalization."

**7. FAQ Section**
- Eyebrow: "No fluff. Just clarity."
- Heading: "Straight answers for growing brands"
- REPLACE ALL existing FAQ content (it's from the "Good Time" template). New FAQs:

Q: "How is Refractive different from a traditional agency?"
A: "Most agencies assign junior account managers who relay messages between you and the people doing the work. We put senior operators directly on your account. No layers. No telephone game. The people on your weekly call are the same people building your campaigns, optimizing your site, and analyzing your data."

Q: "What does the first 30 days look like?"
A: "We start with a full audit of your current stack: paid accounts, site performance, email flows, analytics setup, and creative library. From there, we build a 90-day operating plan with clear KPIs, testing priorities, and a channel-by-channel roadmap. Most clients see their first optimizations live within two weeks."

Q: "Do I need to use all your services?"
A: "No. Some brands come to us for paid media and measurement only. Others want the full growth engine. We build a scope around what you actually need and scale from there. But the magic happens when channels work together, so we always recommend starting with at least two connected pillars."

Q: "How does pricing work?"
A: "We use flat monthly retainers, not percentage of ad spend. This means our incentives are aligned with yours. We're not rewarded for spending more of your money. We also offer performance bonuses tied to KPIs so we win when you win."

Q: "What size brands do you work with?"
A: "We work with emerging and mid-market DTC brands, typically doing $1M to $50M in annual revenue. Our sweet spot is founder-led teams that have product-market fit but need senior marketing operators to scale profitably."

Q: "What is Illuminate?"
A: "Illuminate is our measurement and analytics product. It gives you full-funnel dashboards, incrementality testing, and media mix modeling so you always know exactly what's driving growth and where to invest next. Think of it as your single source of truth."

**8. Contact Section**
- Heading: "Let's build something that compounds"
- Simple form: First name, Last name, Email, Company/Brand, Monthly revenue range (dropdown: Under $1M, $1M-$5M, $5M-$20M, $20M+), Message
- OR: embed a Calendly booking widget
- CTA button: "Book a Growth Audit"

**9. Footer**
- Refractive logo
- Newsletter signup: "Fuel for founder-operators. Playbooks for paid, CRO, Shopify, retention, and Illuminate, built by senior operators."
- Footer links organized as:
  - SOLUTIONS: Brand Strategy, Performance and Acquisition, Experience and Conversion, Retention and Lifecycle
  - ILLUMINATE: Attribution, Incrementality, Creative Performance, AI Enhanced
  - INSIGHTS: Blog, Playbooks and Templates
  - ABOUT: Team, Careers, Contact
- Copyright: "© 2025 Refractive. All rights reserved."
- Fix typos: "Incrimentality" → "Incrementality", "Carrers" → "Careers", "Enchanced" → "Enhanced"

---

### CRITICAL FIXES (apply throughout)

1. **Remove ALL template placeholder content:**
   - Any "Clone webflow components" text
   - Any "Lorem ipsum" text
   - Any references to "Good Time" (the template brand)
   - Mobile nav placeholder links ("Mobile Link 1, 2, 3")
   - Contact form placeholder dropdown options ("First Choice, Second Choice, Third Choice")
   - The "No-code Tools" section (Webflow, Memberstack, Airtable, etc.)

2. **Fix all typos:**
   - "Content Stratgy" → "Content Strategy"
   - "AI Enchanced" → "AI Enhanced" (appears in cards AND footer)
   - "Incrimentality" → "Incrementality" (footer)
   - "Carrers" → "Careers" (footer)

3. **Simplify the navigation:**
   - Remove the mega-menu with 20+ sub-service links
   - Nav items: How We Work, Solutions, Illuminate, About, [CTA: Book a Growth Audit]
   - Keep it clean. The depth lives on the pages, not in dropdowns.

4. **Responsive / mobile:**
   - Ensure all sections stack cleanly on mobile
   - Hero text should be readable on small screens
   - Video hover states on brand logos should degrade gracefully to static images on mobile/touch

5. **Performance:**
   - Lazy load videos and images below the fold
   - Optimize any large assets
   - Keep the page fast. Under 3s load time target.

---

### DESIGN DIRECTION

- **Dark mode first.** Dark charcoal backgrounds, white text, blue-purple gradient accents.
- **Generous whitespace.** Let sections breathe. Don't pack content tight.
- **Minimal formatting.** No heavy borders, no drop shadows, no rounded-everything. Sharp, geometric, clean.
- **Typography hierarchy:** Large, bold headlines. Lighter weight subheads. Body text at comfortable reading size.
- **Interactions:** Subtle. Smooth scroll between sections. Fade-in on scroll for content blocks. No aggressive animations.
- **The overall feel should be:** "This agency is serious, modern, and clearly run by someone who knows what they're doing." It should feel like a $5M agency, not a one-person startup.

---

### WHAT NOT TO DO

- Don't add stock photography
- Don't use generic icon libraries (Font Awesome default icons, etc.) unless styled to match the brand
- Don't add testimonial sections with fake quotes
- Don't create separate pages for each service (keep it consolidated)
- Don't add a blog or resources section beyond a placeholder link
- Don't add pricing tiers or packages to the homepage (that's a separate page later)

---

## PROMPT END
