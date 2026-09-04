# Reef's published files, as Reef published them

A verbatim copy of one `manage.py precompute subjects` run against Reef's seeded
vocabulary. The layout mirrors the blob store: `subjects.json` is the index, and
`subjects/<slug>.json` is the file behind one subject page.

Copied rather than written. Fixtures somebody types are fixtures somebody
believes in, and these have to be what Reef actually emits, because their job is
to be parsed through the Zod schema generated from `reef_api.yaml` — which is how
Red finds out that Reef's output and Reef's contract have stopped agreeing.

## Refreshing

Both repositories are siblings under `~/Code`:

```
cd ~/Code/reef
REEF_DEPLOYMENT_MODE=development ./manage.py seed_subjects --write   # if the sheet changed
REEF_DEPLOYMENT_MODE=development ./manage.py precompute subjects
cp -r precomputed/subjects.json precomputed/subjects \
      ~/Code/red/website/app/utilities/reef-fixtures/precomputed/
```

No transformation step, deliberately. A sync that reshaped the data on the way
across would be a second thing to keep correct, and the first thing to fall
behind.

## What this copy does not contain

Whatever the run it came from did not. That is worth knowing before reading a
gap here as a bug in Red:

- **No document assignments.** The seed sheet is the vocabulary — one row per
  subject, with its name and description — and carries no `rfc` column. So every
  `documents` array is empty, `document_meta` is `{}`, and the index's
  `documents` map is `{}`. Assignments arrive through Reef's `import_subjects`,
  reading a different sheet; refresh this copy after that runs and the titles
  appear.
- **No retired subject and no alias.** Reef's vocabulary contains neither, so a
  run cannot emit one. The redirect stubs are two of the three shapes
  `/subjects/<slug>/` answers with, so the tests build them by hand rather than
  going without coverage of them. That is the deliberate division: real data
  here, invented data in the test that needs a state real data does not have.
