---
name: maisongr-seo
description: Maison GR method for making public web pages findable by people, search engines and AI assistants. Use when creating or changing a public page or its metadata, choosing keywords, titles or URLs, working on canonical URLs, redirects, hreflang, robots.txt, sitemaps, structured data (JSON-LD), Open Graph tags or llms.txt, running an SEO audit, or when a page is not indexed, ranks for the wrong query, or is quoted wrongly by an AI assistant.
license: MIT
metadata:
  author: Maison GR
---

# Maison GR Search and AI Discoverability

## Objective

Each public page answers one search intent, says so in the places search engines and AI assistants read, and can be crawled, indexed and quoted accurately. Nothing is done that a search engine penalises.

## When to use

- Creating a public page, or changing its content, title, URL or metadata.
- Changing canonicals, redirects, `hreflang`, `robots.txt`, a sitemap, structured data or `llms.txt`.
- Auditing a site's search health.
- A page is missing from search results, competes with another page, or is described wrongly by an assistant.

Not for pages behind a sign-in; those are kept out of the index (step 4).

## Method

### 1. Name the query and the intent

- For each page, name the queries its real audience types, in each language the site serves, and what the searcher wants: to learn, to compare, to buy, to reach a place or a person.
- Take queries from evidence: the project's notes, search console data, the words customers use. If you have no data, say so. Never invent search volumes or rankings.
- One page, one intent. Record the page's main query where the project keeps such notes.

### 2. Check that no other page competes for it

Before creating or optimising a page, list the site's existing pages on the same topic: their titles, headings, slugs and, where available, the queries each one already receives. Two pages aimed at one query split their signals and both rank worse.

| Situation | Resolution |
|---|---|
| Two pages, same intent | Merge into the stronger one and redirect the other permanently |
| Two pages, different intents, similar wording | Differentiate titles, headings and opening paragraphs so each names its own intent |
| Variants of one page (filters, tracking parameters, print views) | One canonical URL; the variants point to it |
| A new page that an existing one already answers | Improve the existing page instead of adding one |

### 3. Say it where it is read

| Place | Rule |
|---|---|
| `<title>` | Unique per page, the main query near the start, about 60 characters |
| Meta description | Unique, a plain summary a searcher would click, about 155 characters |
| `<h1>` | Exactly one, stating the page's subject in the audience's words |
| First paragraph | Answers the query directly, before any preamble |
| URL slug | Short, readable, lowercase, hyphenated, in the page's language |
| Headings | An ordered outline; each section heading says what the section answers |
| Links | Text that names the destination, never "click here"; link related pages to each other |
| Images | Meaningful `alt` text, descriptive file names, explicit dimensions |

Write for the reader. A query repeated unnaturally reads badly and ranks worse.

### 4. Control what is indexed, and under which address

- Every indexable page declares its **own** canonical URL. Never set a canonical in a shared layout: every page inherits it and claims to be a copy of one page.
- Canonicals, sitemap entries, internal links, `hreflang` and Open Graph URLs all use the address the site actually serves: the same scheme, host (`www` or not) and trailing-slash form. An address that redirects is an error.
- Sign-in, account, checkout, search-result, reset and invitation pages are `noindex` and stay out of the sitemap.
- Do not block a `noindex` page in `robots.txt`: the crawler must fetch the page to read the tag.
- A URL that changes gets a permanent redirect (301 or 308) to its new address, in one hop. Never leave a 404 where a page used to be, and never redirect everything to the home page.
- Content that matters is in the HTML the server sends. Text that exists only after client-side rendering may not be read by every crawler or assistant.

### 5. Serve each language properly

- Each language version has its own URL and its own translated title, description and slug.
- Each version lists every alternate, itself included, with `hreflang`, plus `x-default`. The references are reciprocal: if A names B, B names A.
- Each version's canonical points to itself, never to another language.

### 6. Add structured data that is true

- Use JSON-LD with the schema.org type that fits: `Organization`, `WebSite`, `Article`, `Product`, `SoftwareApplication`, `FAQPage`, `BreadcrumbList`, `LocalBusiness` only for a business that really operates at that address.
- Every value in the markup is visible on the page and true. No invented ratings, review counts, prices or awards.
- Validate it with the search engines' own testing tools, or say it was not validated.
- Add Open Graph and social card tags with a real image at the size the platforms expect.

### 7. Publish a sitemap and a robots file that agree

- Generate the sitemap from the same route list as the site. Never edit it by hand.
- It lists every public, indexable URL in every language, and nothing that redirects, returns an error or is `noindex`.
- `<lastmod>` is the date the content really changed, not the build or request time. Search engines stop trusting dates that move on every visit.
- `robots.txt` allows public content, disallows what crawlers have no reason to fetch (API routes, internal tools), and names the sitemap by its absolute URL. Pages that rely on `noindex` stay crawlable (step 4).
- Whether AI crawlers may read the site is the owner's decision. Ask, record the answer, and keep `robots.txt` consistent with it.

### 8. Write so an assistant can quote it

AI assistants answer from passages, not from pages.

- State facts in text: prices, places, dates, who the product is for, what it does not do. A fact that exists only in an image, a video or a script cannot be quoted.
- Answer first, then explain. A section that opens with its answer in one or two sentences is quoted correctly more often than one that builds up to it.
- Make each section stand alone: name the subject instead of "it" or "this", so a passage lifted out of the page still makes sense.
- Keep the facts consistent everywhere: the same name, address, price and description on every page and profile.
- Use question headings only where they are questions people really ask.
- Publish `/llms.txt`: a short Markdown summary of what the site is, with links to its key pages. Keep it true and current.
- Show when content was last updated, and change that date only when the content changes.

### 9. Check the live result

After the page is public:

- It returns status 200 at its canonical address, and the other address forms redirect to it in one hop.
- The served HTML contains the title, description, `h1`, canonical, `hreflang` and structured data, with no accidental `noindex` in a tag or a response header.
- It appears in the sitemap with a true `<lastmod>`, and `robots.txt` does not block it.
- It is fast and usable on a phone. Core Web Vitals are a ranking signal.

## Constraints

- Never use tactics search engines penalise: hidden text, keyword stuffing, cloaking, doorway pages, bought links, fake reviews, or invented figures in structured data.
- Never promise a ranking, a traffic figure or a timescale. Search results are not under the project's control.
- Never change or remove a public URL without a permanent redirect.
- Never change what crawlers, including AI crawlers, may access without the owner's decision.
- Do not submit sitemaps, request indexing or change search console settings without approval; those act outside the repository.
- Do not add an SEO plugin, analytics script or third-party service without approval.

## Verification

- [ ] The page's main query and intent are named, and no other page on the site targets the same one.
- [ ] Title, description, single `h1`, first paragraph and slug are unique and carry the query naturally.
- [ ] The page has its own canonical, using the served address; alternates are reciprocal where the site is multilingual.
- [ ] Structured data matches the visible content and was validated, or the report says it was not.
- [ ] The sitemap lists the page once with a true `<lastmod>`; `robots.txt` does not block it; private pages are `noindex` and unlisted.
- [ ] The key facts are present as text in the served HTML.
- [ ] After deployment, the live page was fetched and checked.

## Output

```text
Page: <url>, main query "<query>" (<language>), intent <learn | compare | buy | reach>.
Competing pages: none, or <urls> and how each was resolved.
Changed: <title, description, canonical, hreflang, structured data, sitemap, robots, llms.txt>.
Checked: <what was fetched or validated, and the result>.
Not verified: <live checks waiting on deployment, tools not available>.
Owner decisions needed: <AI crawler access, redirects for removed pages, submissions>.
```
