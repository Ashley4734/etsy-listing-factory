# Etsy Digital Product Listing Factory

A deployable MVP for turning one digital product idea into a complete Etsy listing kit:

- SEO title, short title, and slug
- 13 Etsy tags with character checks
- Full Etsy description
- Feature bullets
- Alt text for listing images
- 10 listing image content plans
- Pinterest pin titles, descriptions, board ideas, and tags
- Downloadable ZIP export with Markdown, CSV, JSON, and SVG listing cards
- Local persistent project storage
- Basic login gate for single-owner use
- Dockerfile and Docker Compose for Coolify/VPS deployment

This MVP does **not** publish directly to Etsy yet. Etsy's API requires OAuth with `listings_w`, draft listing creation, image upload, digital file upload, and setting `type=download`. This app is intentionally built as a safe export-first tool, with Etsy API placeholders ready for a later draft-push feature.

## Local setup

```bash
cp .env.example .env
npm install
npm run dev
```

Open: `http://localhost:3000`

Default login is controlled by `.env`:

```env
APP_USERNAME=admin
APP_PASSWORD=change-me-now
```

## AI mode

Set `OPENAI_API_KEY` in `.env` to use AI generation. Without it, the app uses a deterministic template generator so the product still works.

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

## Coolify deployment

Recommended deployment method: **Git repository + Dockerfile build pack**.

1. Push this folder to a GitHub/GitLab repository.
2. In Coolify, create a new Application from the repository.
3. Choose the Dockerfile build pack.
4. Set the exposed port to `3000`.
5. Add a persistent storage volume:
   - Container path: `/app/data`
6. Add runtime environment variables:
   - `NODE_ENV=production`
   - `PORT=3000`
   - `APP_BASE_URL=https://your-domain.com`
   - `DATA_DIR=/app/data`
   - `OPENAI_API_KEY=your_key`
   - `OPENAI_MODEL=gpt-4o-mini`
   - `APP_USERNAME=your_admin_user`
   - `APP_PASSWORD=a_strong_password`
   - `SESSION_SECRET=a_long_random_string`
7. Deploy.

## App workflow

1. Create a product project.
2. Enter product type, theme, style, buyer, keywords, included files, and pricing notes.
3. Upload optional product/cover images for reference and export storage.
4. Generate the listing kit.
5. Review/edit manually if needed.
6. Export the ZIP and use the content in Etsy, Pinterest, or your product folder.

## Suggested next feature upgrades

1. Editable projects and regenerate by section.
2. Etsy OAuth onboarding with PKCE.
3. Push to Etsy draft listings.
4. Direct listing image PNG/JPG rendering.
5. User accounts and Stripe subscriptions.
6. Product research workflow using Etsy/Pinterest trend keywords.
7. Mockup generator using saved brand presets.

## Environment variables

| Variable | Required | Description |
|---|---:|---|
| `PORT` | No | Server port. Defaults to `3000`. |
| `DATA_DIR` | No | Persistent data path. Defaults to `./data`. Use `/app/data` in Docker. |
| `OPENAI_API_KEY` | No | Enables AI listing generation. |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini`. |
| `APP_USERNAME` | Yes in production | Basic login username. |
| `APP_PASSWORD` | Yes in production | Basic login password. |
| `SESSION_SECRET` | Recommended | Reserved for later session-based auth. |
| `UPLOAD_MAX_MB` | No | Max upload size in MB. Defaults to 50. |

## Notes

- The app is built for a single owner/operator MVP.
- Projects are stored as JSON files in `/app/data/projects`.
- Uploaded references are stored in `/app/data/uploads`.
- Keep `/app/data` on a persistent Coolify volume.
