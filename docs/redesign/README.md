# Consultant Redesign

Redesign of anthonyl.com from the green "console" terminal theme to a professional consulting site.

![Approved mockup](mockup.png)

## Approach

- Build a new Hugo theme at `themes/consultant/` and set `theme = "consultant"` in `config.toml`. Keep `themes/console/` untouched so it can be rolled back.
- Hugo version must match CI: **0.124.1 extended** (`.github/workflows/deploy.yml`).
- Pull content from existing data/content where it exists:
  - Experience → `data/experience.yaml`
  - Projects → `content/portfolio/*.md` (ShotBotz, WelcomeSign, Triton Agency featured)
  - Contact/social → `[params]` in `config.toml`
- New content (services, case studies, process steps, stats) goes in new data files (e.g. `data/services.yaml`, `data/casestudies.yaml`, `data/process.yaml`, `data/stats.yaml`) — not hardcoded in templates.
- Wiki (`/wiki/`), Portfolio (`/portfolio/`) and Music (`/music/`) pages must keep working with the new theme. Music is linked from footer only.
- Responsive: must work at 390px mobile width (no horizontal scroll, hamburger nav).

## Design tokens

| Token | Value |
|---|---|
| Primary (navy) | `#0B1F3A` |
| Accent (teal) | `#0F7C80` |
| Project card bg | `#12294A` |
| Background | `#FFFFFF`, light band `#F3F5F8` |
| Headings | Playfair Display or Source Serif (Google Fonts) |
| Body | Inter (Google Fonts) |

## Sections (top to bottom)

1. **Sticky nav** — name + "Cloud Architecture & DevOps Consulting"; Services, Projects, Case Studies, Experience, Contact; navy "Book a Consultation" button.
2. **Hero** — "AWS Architecture & Automation for Teams That Need to Scale"; subhead; "Schedule a Call" + "View Projects" buttons; headshot (placeholder until a real photo is supplied).
3. **Trust bar** — "Experience with" Zendesk, Mood Media, Citco, U.S. Navy (GovCloud), Levvel (text, grayscale).
4. **How I Can Help** — "Sound familiar?" checklist + 3 engagement cards (Architecture Review, Migration / Build Project, Fractional DevOps Retainer) with "Contact for quote".
5. **Stats** — `[X]% infra cost reduction`, `[X] migrations delivered`, `20+ years`. Values in `data/stats.yaml`; owner fills in real numbers.
6. **Featured Projects** — full-width navy band, 3 dark cards with screenshot, description, tags, arrow link to the portfolio page.
7. **Case Studies** — 3 cards: On-prem to AWS migration (financial services), GovCloud automation (U.S. Navy), Large-scale Kubernetes deployments (SaaS).
8. **How I Work** — Assess → Design → Implement → Support.
9. **Experience** — compact timeline from `data/experience.yaml`.
10. **CTA band** — "Let's talk about your infrastructure" + "Book a Consultation".
11. **Footer** — Charlotte NC, email, LinkedIn, GitHub, links to Wiki and Portfolio.

## Do NOT copy from the mockup

The mockup is AI-generated. Fix these instead of reproducing them:

- Typo "Kuberentes" → **Kubernetes**.
- Case-study claims "zero downtime" and "millions of users" are invented — use neutral text or ask the owner.
- Stock photos (skyscrapers, ship, containers) and the headshot are placeholders.
- No testimonials unless the owner provides real ones.

## Open questions for the owner

- "Book a Consultation" target: Calendly/booking link, or `mailto:anthony@linsday.net`?
- Real headshot photo.
- Real numbers for the stats row.
- Should case studies get their own pages, or link to the portfolio?
