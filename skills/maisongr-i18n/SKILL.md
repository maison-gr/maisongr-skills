---
name: maisongr-i18n
description: Maison GR method for building software that works in more than one language and region. Use when adding or changing user-facing text in a multilingual product, adding a language or locale, setting up or reviewing internationalisation (i18n) and localisation (l10n), writing translation messages, handling plurals, formatting dates, numbers or currency, supporting right-to-left languages, or adding locale routing and a language switcher.
license: MIT
metadata:
  author: Maison GR
---

# Maison GR Internationalisation

## Objective

Every user reads the product in their own language, with correct grammar, dates, numbers and money, in a layout that holds. Adding a language is translation work, not engineering work.

## When to use

- Adding or changing user-facing text in a product that has, or will have, more than one language.
- Adding a language or a regional variant.
- Writing or reviewing translation messages, plurals or formatted values.
- Supporting a right-to-left language.
- Adding locale routing, locale detection or a language switcher.

## Method

### 1. Learn the existing setup

- Find the i18n library, the list of supported locales, the default locale and the fallback order.
- Find where messages live, how keys are named, and how a locale is chosen: URL, stored preference, request header.
- Find how translations are produced: by the team, by translators, by a translation platform. That decides what you may write yourself.
- A product with no setup yet needs a library choice. That is a dependency decision; propose it before building.

### 2. Externalise every user-facing string

- No user-facing text in code. That includes what is easy to miss: `alt` text, `aria-label`, `title`, placeholders, validation and error messages, page titles and meta descriptions, emails, notifications, PDF and export headings.
- Name keys by meaning and place (`checkout.submit`), never by the source text.
- One key per use. The same word can need two translations: "Open" the action and "Open" the state.
- Never build a sentence by joining fragments. Word order changes between languages. Write the whole sentence as one message with named placeholders:

  ```text
  Wrong:  t("deleted") + " " + count + " " + t("files")
  Right:  t("files.deleted", { count })
  ```

- Markup inside a sentence (a link, bold text) stays inside the message, through the library's rich-text mechanism, so translators can move it.
- Give translators context where the library supports it: what the placeholder holds, where the text appears, any length limit.

### 3. Handle plurals and grammar with the library

- Use the library's plural support (ICU MessageFormat or its equivalent), never `count === 1 ? singular : plural`. Languages do not share English's rule: French treats 0 as singular, Polish and Russian have separate forms for few and many, Arabic has six forms.

  ```text
  {count, plural,
    =0 {No files}
    one {# file}
    other {# files}}
  ```

- Every plural message has an `other` branch, and each locale has the categories its language needs.
- Use `select` for text that varies with gender or another category. Do not guess a person's gender from a name.
- Do not reuse a noun across sentences where its grammatical case or article would change.

### 4. Format values with the locale

Use the platform's locale-aware formatters (`Intl` in JavaScript, or the language's equivalent). Never format by hand.

| Value | Rule |
|---|---|
| Dates and times | Store a moment in time in UTC and format it in the user's locale and time zone. A date with no time (a birthday, a due date) is a calendar date: store it as one and never shift it by time zone. Never build a date from string pieces |
| Numbers | The locale decides decimal and grouping separators: `1,234.5`, `1 234,5`, `1.234,5` |
| Currency | Store the amount with its currency code. The locale decides symbol and position: `$29.00`, `29,00 $`. Never infer the currency from the language |
| Relative time, lists, units | Use the formatter; "3 days ago" and "A, B and C" are grammar, not concatenation |
| Sorting and search | Compare with a locale-aware collator, so accented letters sort where the language expects |
| Parsing input | Accept the locale's format: a decimal comma is valid input in most of Europe |

### 5. Let the layout hold translated text

- Text grows. Short labels can double in length; paragraphs commonly grow by a third. No fixed widths on text containers, and no truncation of a label that carries an action.
- Check the longest translation, not the English.
- Use logical CSS properties (`margin-inline-start`, `padding-inline-end`, `text-align: start`) so the layout mirrors in right-to-left languages. Mirror direction-bearing icons (back arrows); do not mirror logos, clocks or media controls.
- Set `lang` on the document, and `dir` for right-to-left. Mark a passage in another language with its own `lang`.
- Keep text out of images. Where an image must carry text, it needs one version per locale.
- Check that the fonts contain every character the supported languages use.

### 6. Route and switch languages

- Each language version of a public page has its own URL, so it can be linked, shared and indexed.
- Suggest a language from the request, but never force it: a stored choice wins over detection, and the user can always switch.
- The switcher names each language in that language ("Français", not "French"), keeps the user on the same page, and does not rely on flags: a flag is a country, not a language.
- Translate the slug, the page title and the description where the site translates its content, and declare the alternates (`hreflang`, with `x-default`).
- A missing translation falls back to the default language and is reported in development. It never shows a raw key to a user.

### 7. Keep the languages in step

- A change to one language is not finished until every supported language is updated.
- Write a translation yourself only when the project works that way. Mark every string you translated for review by a fluent speaker, and say so in the report.
- Add or run the project's check for missing and unused keys.
- Find hard-coded strings with pseudo-localisation where the library supports it: accented, lengthened placeholder text makes untranslated text and overflow visible at once.

## Constraints

- Do not add an i18n library, a translation service or a paid translation API without approval.
- Never concatenate translated fragments or hand-format dates, numbers or money.
- Never rename or delete a message key that other code or stored translations depend on without updating every locale.
- Never present a machine or self-written translation as reviewed.
- Legal text (terms, privacy, consent) is translated by a qualified person; flag it rather than translating it.

## Verification

- [ ] No user-facing string this task added or changed remains in code, including accessibility text and metadata. Older hard-coded strings in the same files are reported, not fixed uninvited.
- [ ] Every supported locale has every new key; the missing-key check passes.
- [ ] Plurals were exercised with 0, 1, 2 and a large number in each language.
- [ ] Dates, numbers and money were viewed in each locale.
- [ ] The interface was viewed in the longest language and, where supported, in a right-to-left language, with no overflow or truncation.
- [ ] The language switcher keeps the same page, and each page declares its `lang`.

## Output

```text
Locales: <supported>, default <x>.
Added or changed: <keys>, in <locales>.
Translations needing review: <keys translated without a fluent reviewer>, or none.
Checked: <plurals, formats, longest language, right-to-left, missing-key check>.
Not verified: <locales or screens not viewed, and why>.
```
