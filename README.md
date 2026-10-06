# resume

Hugo source for [anthonyl.com](https://anthonyl.com). Deployed to GitHub Pages on push to `main` (`.github/workflows/deploy.yml`, Hugo **0.124.1 extended**).

## Theme

The site uses the **`consultant`** theme (`themes/consultant/`) — navy/teal professional consulting design. The previous green terminal theme is kept at `themes/console/`; to roll back, set `theme = "console"` in `config.toml`.

Design spec and approved mockup: [`docs/redesign/README.md`](docs/redesign/README.md).

## Build locally

```sh
hugo server            # dev server at http://localhost:1313
hugo --minify          # production build to ./public
```

## Where content lives

| What | Where |
|---|---|
| Site settings, contact info, booking link, nav menu | `config.toml` (`[params]`, `[menu]`) |
| Home: "Experience with" logo bar | `data/clients.yaml` |
| Home: "How I Can Help" pain points + engagement cards | `data/services.yaml` |
| Home: results stats row | `data/stats.yaml` |
| Home: "How I Work" steps | `data/process.yaml` |
| Jobs (one page each, home timeline) | `content/experience/*.md` |
| Case studies (one page each) | `content/case-studies/*.md` |
| Projects / portfolio | `content/portfolio/*.md` |
| Wiki articles | `content/wiki/<category>/*.md` |
| Music player | `static/music/*.mp3` + `data/music.yaml` |
| Images (headshot, project screenshots) | `static/images/`, `static/images/projects/` |

### Projects

Front matter used by the theme: `title`, `description`, `weight` (sort order), `image` (screenshot), `cardTags` (pills on the card), `tech`, `demo` (site link), `featured: true` (shows on the home page, sorted by `weight`).

### Booking button

Every "Book a Consultation" / "Schedule a Call" / "Contact for quote" button uses `params.bookingURL` (currently a `mailto:`). Change it there to switch to a booking link.

### Notes

- `data/experience.yaml` and `data/resume.yaml` are only used by the old `console` theme; the new theme reads jobs from `content/experience/`.
- Client cost-savings figures are attributed only to "a media company" — never name the client next to them.
- Unknown details in case studies/jobs are left as `<!-- TODO (owner): ... -->` HTML comments (not visible on the site).
