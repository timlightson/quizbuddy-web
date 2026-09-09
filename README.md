# QuizBuddy

**[Open the app →](https://timlightson.github.io/quizbuddy-web/)**

A study app you own. Flashcards, adaptive learning, generated tests, and three
games — with real spaced repetition underneath. No ads, no account, no paywall,
no "upgrade to see your progress."

Everything lives in your browser's local storage. There's no backend, so nothing
is uploaded and it works offline. The hosted copy is the same static build you
get from `npm run build` — it has no server to talk to either.

![MIT licensed](https://img.shields.io/badge/license-MIT-blue)
![No tracking](https://img.shields.io/badge/tracking-none-brightgreen)
![Static site](https://img.shields.io/badge/backend-none-lightgrey)

## Running it locally

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173.

To build a static copy you can host anywhere (or just open locally):

```bash
npm run build
```

## What's in it

**Study modes**
- **Learn** — adaptive rounds. Cards you barely know come as multiple choice; once
  you're solid they switch to typed recall. Misses cycle back within the round.
- **Flashcards** — 3D flip, keyboard driven (space to flip, arrows to move, 1–4 to
  grade), with due-first / all / starred scopes.
- **Write** — typed answers with forgiving grading, plus an "I was right" override
  for when the grader is too strict.
- **Test** — a generated exam mixing multiple choice, true/false, written, and
  matching. Graded with a review of what you missed.

**Games**
- **Match** — clear a grid by pairing terms with definitions against the clock.
  Misses add two seconds, so accuracy shows up in your time.
- **Meteor** — terms fall; type the definition before they land. Three lives,
  escalating levels, more points for catching them high.
- **Quiz Rush** — 60 seconds of rapid multiple choice with a speed bonus and a
  streak multiplier.

**The scheduling** — an SM-2 spaced repetition scheduler decides when each card
comes back, from ten minutes to a year out. Cards carry an easiness factor,
interval, and lapse count; every mode writes back into the same schedule, so
playing a game genuinely advances your studying. Cards you keep forgetting get
flagged as leeches, because more repetitions won't fix those — rewording will.

**Starting out** — the library starts empty, the way a live site should. A
[demo page](https://timlightson.github.io/quizbuddy-web/#/demo) holds six
ready-made sets (88 cards across science, languages and humanities) that you can
flip through without signing up for anything; nothing lands in your library until
you press the button. The landing page's preview card is the real component, not
a screenshot — click it.

**Getting cards in** — upload them to the AI Studio (below), type them by hand, or
paste from a doc, spreadsheet, or another study app. The importer guesses your
separator and splits on its *first* occurrence, so commas inside definitions
survive.

**Tracking** — 26-week activity heatmap, streaks, per-set mastery breakdown,
lifetime accuracy, time studied, test history, and game bests.

**Also** — global search across every set and card (⌘K), XP and levels, a daily
goal ring, dark and light themes, text-to-speech with per-side language (useful
for vocabulary sets), adjustable grading strictness, and full JSON export/import
for backups.

## Bring your own model

There is no built-in AI provider and no key of ours. Pick whichever you already
pay for — or run one locally and pay nobody:

| Provider | Reads PDFs | Reads images | Notes |
|---|---|---|---|
| Anthropic (Claude) | yes | yes | Best at messy scans and handwriting |
| Google (Gemini) | yes | yes | Generous free tier |
| OpenRouter | yes | yes | One key, hundreds of models |
| Groq | no | no | Very fast, text only |
| DeepSeek | no | no | |
| Mistral | no | yes | |
| Ollama (local) | no | no | Runs on your machine; nothing leaves it |
| Any OpenAI-compatible URL | varies | varies | LM Studio, vLLM, a company gateway |

Keys are stored per provider, so switching back and forth doesn't lose them.

**Model names are fetched from the provider, not hardcoded.** Save a key and the
model field becomes a real list of what that key can actually run — because
providers retire models (Google pulled `gemini-2.5-pro` for new keys, and the
same model is still live on OpenRouter, so availability is per-provider *and*
per-key). If a model you had saved disappears, QuizBuddy notices on the next
refresh and moves you to one that exists rather than failing on every call.

> **OpenAI is listed but not directly reachable.** `api.openai.com` sends no CORS
> headers, so no browser app can call it — including this one. It's marked as
> such in Settings. Reach GPT models through OpenRouter, or point the Custom
> provider at your own proxy.

## Twelve ways to make a deck

**No AI needed:** *I already have them* takes a pasted list or an uploaded
`.txt` / `.csv` / `.tsv` — a Quizlet or Anki export drops straight in. The
separator is detected automatically and split on its *first* occurrence, so
commas inside definitions survive. You can override the separator and swap
term/definition order after the fact.

**From your material:** standard flashcards, fill-in-the-blank cloze cards, key
terms only, exam questions, formulas and equations, dates and events, easily
confused pairs, and language vocabulary — each with its own prompt tuned to that
shape of card.

**From nothing but an idea:** *From a topic* needs no source at all. *I have
terms* writes the definitions; *I have definitions* works out the terms.

Everything lands in an editable, individually selectable draft list. Nothing is
saved until you approve it, and you can keep refining by chat — *"make them
harder"*, *"focus on chapter 4"*, *"shorter answers"*.

**PDFs and images are handed to the model directly rather than scraped for
text**, so diagrams, tables, equations, scanned handouts, and photos of
handwriting all come through. `.docx` is converted locally.

## Other things to do with your notes

Cards aren't the only useful output. The **Study tools** tab turns the same
uploaded material into a summary, a structured study guide, practice questions
with an answer key, a list of the gaps your notes leave, plain-language
explanations of the hard parts, or mnemonics for what won't stick. Each renders
as formatted text you can copy or save as Markdown.

**Ask your notes** is a straight Q&A against your material — it answers from
what you uploaded and says so when it's drawing on general knowledge instead.

Two smaller AI features live outside the hub: filling in definitions for terms
you typed but left blank, and asking why you missed a card in Learn.

Keys are kept in local storage and sent straight to the provider you chose.
Anything running on the page could read them — fine on your own machine, worth
knowing on a shared one. Usage bills to your own account. The app boots on
~70 KB of gzipped JS; every study mode, the Create hub, and the `.docx` parser
load on demand.

## Running it locally## Running it locally

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173.

To build a static copy you can host anywhere (or just open locally):

```bash
npm run build
```

## What's in it

**Study modes**
- **Learn** — adaptive rounds. Cards you barely know come as multiple choice; once
  you're solid they switch to typed recall. Misses cycle back within the round.
- **Flashcards** — 3D flip, keyboard driven (space to flip, arrows to move, 1–4 to
  grade), with due-first / all / starred scopes.
- **Write** — typed answers with forgiving grading, plus an "I was right" override
  for when the grader is too strict.
- **Test** — a generated exam mixing multiple choice, true/false, written, and
  matching. Graded with a review of what you missed.

**Games**
- **Match** — clear a grid by pairing terms with definitions against the clock.
  Misses add two seconds, so accuracy shows up in your time.
- **Meteor** — terms fall; type the definition before they land. Three lives,
  escalating levels, more points for catching them high.
- **Quiz Rush** — 60 seconds of rapid multiple choice with a speed bonus and a
  streak multiplier.

**The scheduling** — an SM-2 spaced repetition scheduler decides when each card
comes back, from ten minutes to a year out. Cards carry an easiness factor,
interval, and lapse count; every mode writes back into the same schedule, so
playing a game genuinely advances your studying. Cards you keep forgetting get
flagged as leeches, because more repetitions won't fix those — rewording will.

**Starting out** — the library starts empty, the way a live site should. A
[demo page](https://timlightson.github.io/quizbuddy-web/#/demo) holds six
ready-made sets (88 cards across science, languages and humanities) that you can
flip through without signing up for anything; nothing lands in your library until
you press the button. The landing page's preview card is the real component, not
a screenshot — click it.

**Getting cards in** — upload them to the AI Studio (below), type them by hand, or
paste from a doc, spreadsheet, or another study app. The importer guesses your
separator and splits on its *first* occurrence, so commas inside definitions
survive.

**Tracking** — 26-week activity heatmap, streaks, per-set mastery breakdown,
lifetime accuracy, time studied, test history, and game bests.

**Also** — global search across every set and card (⌘K), XP and levels, a daily
goal ring, dark and light themes, text-to-speech with per-side language (useful
for vocabulary sets), adjustable grading strictness, and full JSON export/import
for backups.

## AI Studio

Add your own Anthropic API key in Settings and the **AI Studio** opens up. Drop in
a lecture PDF, exported slides, a Word doc, or a photo of handwritten notes, and
Claude drafts a deck from it. Then you keep talking to it:

> *"Make them harder"* · *"Focus on chapter 4"* · *"Add 10 more"* · *"Simplify the wording"*

Every draft lands in an editable review list with checkboxes — nothing is saved
until you say so, and you can rewrite any card first. Save into a new set or
append to one you already have.

**PDFs and images are handed to the model directly rather than scraped for text.**
That matters: diagrams, tables, equations, scanned handouts, and photos of
handwriting all come through, where text extraction would drop them. `.docx` is
converted locally; `.txt`, `.md`, `.csv` and friends are read as-is.

The material is replayed on each turn so follow-ups can see it, with a cache
breakpoint on the sources so that stays cheap.

Three smaller AI features live outside the studio: filling in definitions for
terms you've typed but not defined, and — in Learn — asking why you missed a
card.

The key is stored in local storage and sent directly to Anthropic from the
browser. Anything running on the page could read it — fine on your own machine,
worth knowing on a shared one. Usage bills to your own account. Both the SDK and
the `.docx` parser load on demand, so skipping AI costs you nothing in page
weight (the app boots on ~53 KB of gzipped JS).

## Layout

```
src/
  lib/
    srs.ts       SM-2 scheduling + answer grading (Levenshtein, article stripping)
    store.ts     zustand store, persisted to local storage
    import.ts    paste parsing and separator detection
    extract.ts   files -> model-readable sources (PDF/image native, docx via mammoth)
    providers.ts one call for Anthropic / Google / any OpenAI-compatible endpoint
    ai.ts        card recipes, note tools, and prompts
    md.ts        small escape-first markdown renderer for model output
    gradients.ts deterministic cover art per set
    tts.ts       speech synthesis
    sound.ts     synthesized WebAudio feedback tones
  components/    router, modals, toasts, and shared study chrome
  routes/        one file per screen
```

One thing worth knowing if you extend this: study modes snapshot their card pool
at the start of a round (`useCardPool`). Every answer writes scheduling data back
to the store, so anything derived live from `set.cards` would get rebuilt
mid-round — reshuffling answers under your cursor and resetting game scores.


## Deploying your own copy

The app is a static build with hash-based routing, so it drops onto any static
host with no rewrite rules.

For GitHub Pages, the included workflow at `.github/workflows/deploy.yml` builds
and publishes on every push to `main` — fork the repo, enable Pages with
**Source: GitHub Actions**, and change the `base` in `vite.config.ts` if your
repo has a different name.

For Netlify, Vercel, or anything else, `npm run build` and serve `dist/`. Set
`base` back to `/` if you're serving from a domain root.

## Contributing

Issues and pull requests are welcome. The code is plain React and TypeScript
with no framework beyond Vite and zustand, and `npm run build` typechecks the
whole thing.

## License

MIT — see [LICENSE](LICENSE).
