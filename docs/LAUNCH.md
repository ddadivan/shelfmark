# Shelfmark launch plan

Draft from the author's planning session on Nov 18–19, 2026. Nothing here is scheduled yet: issues, roadmap changes and ADRs follow once the author decides. Prices and service limits are estimates from mid-2026; check them before acting.

## 1. Launch without big spending

The plan: launch for free, keep every cost capped, bring in the first users, watch for 4–6 weeks, and only then decide on payments.

**Who to bring in first:** former Pocket and Omnivore users, who are actively looking for a replacement. Then developers and the self-hosted crowd. Users in the US and Europe.

### Steps, in order

| # | Step | Cost |
| --- | --- | --- |
| 1 | **Rename before the launch.** "Shelfmark" is taken: every main domain zone is registered (`shelfmark.com` belongs to an unrelated machinery company) and the name is likely used by a known self-hosted book downloader, right in the r/selfhosted audience. Candidates with free domains on Nov 19, 2026: Marknest (`marknest.app`, `getmarknest.com`), Linkburrow (`linkburrow.com`, `linkburrow.app`), Tabshelf (`tabshelf.app`, `gettabshelf.com`); fallbacks with only `get….com` free: Keepmark, Pinmark, Linkloft, Linkshelf. Check the chosen name as a trademark (TMview, WIPO, USPTO classes 9 and 42) and as a product (GitHub, Reddit, App Store, Chrome Web Store). The rename touches code, translations, design, logo, videos and the extension | $0 |
| 2 | **Domain** and the move to it (details below) | \~$10–15 a year |
| 3 | **Project identity** (details below): project Google account, addresses on the domain, a GitHub organization; personal email and name out of public places | $0 |
| 4 | **Cap every cost** (details below): Anthropic limit $30 a month, Voyage limit, no card with automatic overage billing, a registration kill switch | $0 |
| 5 | **Import (#387)**, at least browser bookmarks and Pocket, so people can move in | $0 |
| 6 | **Reverse trial and "Want Pro"**: 14 days of Pro for every new account, then Free; at the end and at every Free limit, "Pro is coming, leave your email" | $0 |
| 7 | **Analytics** (Plausible or Umami, no cookies) and usage counters | $0–9 a month |
| 8 | **Licence, Privacy Policy, Terms**, a contact address on the domain | $0 |
| 9 | **Landing as a Pocket alternative**, a "Move from Pocket" guide, Chrome Web Store listing | $0 |
| 10 | **Uptime monitoring and database backups** | $0 |
| 11 | **Launch in waves** (below) | $0 |
| 12 | **Watch for 4–6 weeks**, then decide on payments and the repository | $0 |

**Total for the first year: about $150–300**, mostly the AI cap and the domain. On free plans a service stops at its limit instead of billing, so the worst case is "AI is off until next month", not a large bill.

### What stays as it is

| Topic | Decision |
| --- | --- |
| Hosting | Stay on Vercel Hobby. Move or switch to Pro ($20 a month) once there is monetisation or a concrete limit (Hobby is for non-commercial use only). |
| Repository | Public at launch, with a licence (FSL leaning, AGPL as the alternative). "Open source" is the main argument on r/selfhosted and Hacker News, and a private repository loses free CI minutes, CodeQL and rulesets. Decide on closing it after 4–6 weeks. |
| Mobile apps | Not for the start. PWA covers Android; iPhone gets save by email and an iOS Shortcut later. |
| Payments | None at launch. Donations are out: subscriptions sell better in the US and Europe. |

### Domain move

DNS, Vercel and the OAuth consoles are the author's manual steps (`docs/SETUP.md`).

- New redirect URIs in the Google and GitHub OAuth apps, the Better Auth base URL.
- A new extension version with the new host, and a new Chrome Web Store review.
- A 301 redirect from `shelfmark-app.vercel.app`. Sessions and installed PWAs are tied to the old origin, so people sign in and install again.
- SPF, DKIM and DMARC for the sending domain.
- CSP, Sentry, landing, videos and docs updated.

### Project identity

The brand comes first and personal data is not everywhere. Full anonymity is not possible (see the last list). Do it before the launch: moving things later is harder.

**Create for the project:**

| What | Why | Cost |
| --- | --- | --- |
| A separate Google account | Chrome Web Store, Google OAuth console, Search Console | $0 |
| Addresses on the domain (`support@`, `hello@`) | Contact in the store, on the site, on the OAuth consent screen | $0 with forwarding (Cloudflare Email Routing), \~$7 a month with Google Workspace |
| A GitHub organization, the repository moved into it | The owner shows as Shelfmark; GitHub redirects the old links | $0 |
| WHOIS privacy on the domain | No name and address in the domain records | usually free |
| Social accounts for Shelfmark | Launch and build in public | $0 |

**Where personal data shows today:**

- **Chrome Web Store:** the contact email (shown publicly on the listing) and the publisher name. Set the contact email to a project address (it has to be verified) and the publisher name to Shelfmark.
- **Google sign-in consent screen:** the support email from the Google OAuth console is shown to everyone who signs in.
- **GitHub OAuth app:** shows its owner; moving it to the organization shows Shelfmark.
- **Git history:** every commit carries the author's name and email and cannot be rewritten without losing history. New commits can use the GitHub noreply address.
- **Vercel:** Hobby is a personal account and a team needs Pro; users do not see it.

**Where it cannot be removed:**

- The Merchant of Record and taxes need the sole proprietor (not public).
- With a paid plan the extension is a "trader" under the EU DSA: address, phone and email are shown to EU users in the Chrome Web Store. Think about a business address before monetisation; stay a non-trader while the product is free.
- Terms and Privacy Policy name the data controller (the sole proprietor) under GDPR; commercial sites for Germany also need an Impressum.

**Check first:** the Chrome Web Store does not simply transfer an extension to another account. Options are a group publisher (a Google Group) or a support request; find out before creating the new account.

**Keep access safe:** every project account in a password manager with 2FA and recovery codes. Losing the project Google account means losing the extension in the store.

**Portfolio:** the CV still links the repository with the author's name; the product itself shows Shelfmark, and a "made by" line on About is the author's choice.

### Cost caps

- Anthropic limit $30 a month, with notifications at $10 and $20 if the console offers them. Free users cost at most \~$0.12 a month each; a trial user at most \~$2 with the lower trial limits.
- A spend limit in Voyage.
- Neon storage checked (about 0.5 GB on the free tier); the article copy must account for it.
- An in-app guard: at 80% of the monthly AI budget, new AI jobs for Free accounts pause.
- A registration kill switch: close sign-ups or show a waitlist.
- Trial limits lower than the AI pack: 200 links and 10 questions a day.
- No AI processing of imported links on Free and trial, only new links.
- A hard spend cap whenever a paid plan is switched on.

### Launch waves

Fix what people report between the waves.

1. **Reddit:** r/pocket, r/selfhosted, r/productivity, r/DataHoarder, r/webdev. A story, not an ad: Pocket shut down, a Ukrainian developer built a replacement, feedback wanted.
2. **Helpful answers** in existing "Pocket alternative" and "what do you use for bookmarks" threads.
3. **Show HN**, while being online to answer every comment.
4. **Product Hunt**, Tuesday to Thursday; the promo videos are ready.
5. **Listings:** AlternativeTo (as an alternative to Pocket, Raindrop, Omnivore), awesome-selfhosted (needs the open licence and self-hosting docs).
6. **Build in public:** posts about building the product with a team of AI agents.

Not at the start: paid ads, launching everywhere on the same day.

### After 4–6 weeks

Two weeks show who came, not who stayed.

| Metric | Good signal |
| --- | --- |
| Return after a week | 20%+ |
| Return after a month | 10%+ |
| AI turned on | 30%+ of active users |
| "Want Pro" clicks | 3–5% of active users |

If dozens of people click "Want Pro" and every fifth comes back after a week, switch on payments (section 3) and email them. If almost nobody clicks, improve the product first.

## 2. Features

### Build first (high priority)

1. **Import from browser bookmarks (#387).** Design and discussion before code (`docs/design/screens/Import.dc.html` exists). Open questions: importing straight from the extension through `chrome.bookmarks` (a new permission and a store review), scope of v1 (browser and Shelfmark backup first, Pocket and Raindrop next), entry points (Settings, empty library, onboarding), limits for 5,000–10,000 bookmarks.
2. **Article copy and reader mode.** The article text (Readability) is stored at save time: clean reading, offline reading in the PWA, full-text search, protection against dead links (#397), better input for AI. Text only, sanitised (no `innerHTML`), behind the SSRF guard, sized for Neon storage. The core feature for former Pocket and Omnivore users, next to Read later (#396).

### Later

| Idea | Notes |
| --- | --- |
| Save by email | Forward a link to a personal address. Works on every device and closes the iPhone gap (iOS Safari has no Web Share Target). Needs the domain and inbound email |
| iOS Shortcut | Share sheet saving on iPhone; needs personal API tokens |
| Personal API tokens | Only together with the MCP server (#395) or the iOS Shortcut |
| Passkeys | An extra sign-in next to Google and GitHub, not the only one (no recovery without email). Not the same as #277 (email and password, waits for a domain and an email provider) |
| RSS for public collections, following other people's collections | Niche until public collections are shared a lot |
| WhatsApp bot | Good for Europe, weak in the US; needs Meta business verification; replies within 24 hours are free |
| "Your year on the shelf" | A shareable yearly summary; time it with a launch moment |
| Listen to an article | Browser speech synthesis; only after the article copy |

### Not planned

| Idea | Why |
| --- | --- |
| Telegram bot | Not now |
| Price tracking | Reliable only from structured data, many shops block bots, daily cron only, no push or email yet |
| Daily work launcher (go-links, link sets, new tab page) | Browsers already cover it (Chrome site search, saved tab groups); strong competitors |
| Native iOS and Android apps | Capacitor wrapper later if needed |

## 3. Monetisation, after the observation period

- **Merchant of Record** (Paddle, Lemon Squeezy or Polar) handles cards, Apple Pay, VAT and sales tax, refunds, chargebacks, invoices and subscription emails. Fee about 5% + $0.50 per payment.
- **First check:** whether they work with Ukrainian sellers and how they pay out (SWIFT, Payoneer). Lemon Squeezy belongs to Stripe, which does not work with Ukraine.
- **The author's side:** sole proprietor, group 3 (5% tax), already in place; one consultation with an accountant about foreign-currency payouts.
- **MoR approval needs:** identity and business check, own domain, Terms, Privacy, Refund Policy (14 days, no questions), a pricing page, a contact.
- **In code:** a pricing page and Upgrade button, the MoR webhook that sets the plan on the account (the plan model exists, #389), a link to the subscription portal in Settings.

### Price

| Product | Monthly | AI |
| --- | --- | --- |
| Raindrop Pro | \~$3 | no |
| Linkwarden Cloud | \~$4 | no |
| Instapaper Premium | \~$6 | no |
| mymind | \~$8–13 | yes |
| Readwise Reader | \~$10–13 | yes |

Proposal:

- **Pro $8 a month** with AI included and a fair-use limit on Ask your shelf (for example 300 questions a month, or Haiku after the limit).
- **Founding price:** $5 a month for life for the first 100 subscribers.
- **Yearly plan later:** $72 a year.

Net per subscriber after the MoR fee, the 5% tax and about $1.50 of AI: $5 → \~$2.5, $8 → \~$5.2, $10 → \~$7.

At $8 a month, with hosting growing with the user count:

| Subscribers | Net a month |
| --- | --- |
| 20 | \~$65 |
| 100 | \~$445 |
| 500 | \~$2,400 |
| 1,000 | \~$4,850 |

With a 2–4% conversion, 100 subscribers need about 3,000–5,000 active users.

## 4. Costs by stage

| Stage | Cost |
| --- | --- |
| Now (two users) | \~$0–10 a month |
| Free launch (hundreds of users) | \~$10–25 a month: domain \$10–15 a year, analytics \$0–9, AI up to the cap |
| Growth (thousands of users) | \~$60–160 a month: Vercel Pro \$20, Neon \~\$20, AI \$20–100, email \$0–20 |
| Mobile apps, if ever | Apple \$99 a year, Google Play \$25 once, 15% of in-app purchases; Sign in with Apple required next to Google and GitHub; sell on the web, not in the app |
| Trademark, once there is interest | EUIPO \~€850, USPTO \~\$350 per class |
