# Medical game generic-drug dictionary

Created 25 October 2026. Catalog version 2026-10-25.1.

## Use in your existing ChatGPT game-building conversation

1. Attach `generic_drug_catalog.json`.
2. Open `game_integration_prompt.txt`, copy its contents, and send them with the attachment.
3. The prompt tells the game-building assistant to inspect the existing validator, explain the proposed adapter, and ask for your choices before modifying the game. It preserves earlier explicit decisions rather than asking you to approve them again.
4. Once the behavior is agreed, test the adapter against your actual questions, scoring, timer and saved progress before enabling it.

The JSON is passive data. It contains no executable code and does not activate settings or override an existing game. Its decision fields deliberately remain `null`. Suggested settings are proposals for discussion.

## Contents

| Measure | Count |
| --- | ---: |
| Generic-name records | 3,330 |
| Ingredient records | 2,919 |
| Precise-ingredient records, including selected salts and forms | 192 |
| Combination ingredient sets | 218 |
| Explicitly identified co-packaged ingredient sets | 1 |
| Accepted generic synonyms | 127 |
| ATC main groups | 14 |
| ATC class nodes at levels 1–4 | 1,318 |
| Populated fourth-level ATC classes | 734 |
| Author-selected study records | 1,374 |
| Exact WHO eEML medicine-name matches | 454 |
| Confusable-name guard pairs | 59 |
| Clinical browsing views | 24 |

The record total counts distinct terminology identities, not 3,330 unrelated active molecules: precise names and combinations are intentionally separate. The catalog contains common, specialist, regional and legacy names, including vaccines, biological products, fluids, electrolytes and diagnostic agents. Inclusion is not a measured claim of common use or current market availability. This is a broad educational nomenclature dictionary, not an exhaustive global formulary.

There are 3,316 RxNorm records, 13 individually verified international ATC entries without assigned RxCUIs, and one explicit local co-packaged ingredient set. Local and ATC substance IDs are visibly different from RxNorm IDs; no RxCUI was invented.

## Files

| File | Purpose |
| --- | --- |
| `generic_drug_catalog.json` | Main file to attach to the other conversation; names, aliases, class hierarchy, references, browsing views and unselected decisions |
| `game_integration_prompt.txt` | Copy-and-paste handoff instructions and follow-up decision questions |
| `drug_names_by_class.md` | Complete readable class-organized name list; names may appear under multiple classes |
| `generic_drug_catalog.schema.json` | JSON Schema, draft 2020-12 |
| `reference_matcher.mjs` | Optional dependency-free offline recognition example; not connected to your game |
| `test_reference_matcher.mjs` | Runnable recognition regression checks |
| `catalog_validation.json` | Structural, identity and reference-validation results and scope limits |
| `reference_matcher_validation.json` | Actual reference matcher test results |
| `source_manifest.json` | Sources, retrieval date and primary source-response checksums |
| `catalog_statistics.json` | Machine-readable counts |

## Database structure

- `drugs`: one object per identity, with `id`, `generic_name`, `record_type`, `rxcui`, `rxnorm_tty`, `aliases`, `class_ids`, `atc_mappings`, `study_tags`, `confusable_ids` and `source_ids`.
- `classes`: class definitions with parent IDs and direct member IDs. For an ATC parent, traverse child classes to collect all members. `descendant_drug_count` is deduplicated across that subtree.
- `atc_mappings`: direct source substance codes and names. These source names are reference data. They are not automatically accepted synonyms.
- `component_ids`: complete ingredient sets for combination records. No combination implies a dose ratio, route or single co-formulated tablet. The co-packaged record is marked separately.
- `related_ingredient_ids`: verified related terminology concepts, not automatic equivalence or synonym rules.
- `additional_class_evidence`: preserves the difference between direct ingredient classification and browsing classes obtained from related ingredients or generic products. Product strengths are not used as clinical dosing instructions.
- `browse_views`: additional study indexes, for example blood-pressure pharmacology, antimicrobials, renal medicine, psychiatry, oncology and toxicology.
- `confusable_pairs`: 22 FDA-documented pairs and 37 additional author-selected identity guards; these are distinguished by `basis` and are not synonyms.
- `sources`: source definitions, URLs and retrieval/version information.
- `integration_contract.owner_decisions`: options for integration, spelling confirmation, vocabulary, synonyms, precise names, combinations, abbreviations, timing and unknown inputs. None is selected.

An ingredient can have several class memberships because use and formulation matter. A class membership does not establish an indication or make drugs interchangeable. In particular, this catalog must not be used as a list of accepted alternatives for a clinical question.

For ATC-mapped entries, the hierarchy supplies the requested class/subclass organization. Supplementary FDA established pharmacologic classes and RxClass mechanism/disposition/chemical classes remain explicitly identified. Twenty-three additional ingredient entries use author-assigned study classes checked against cited primary sources; they are marked `author_assigned_study_class_checked_against_cited_source`. These are not presented as direct WHO ingredient mappings.

## Spelling behavior to agree with the game builder

The recommended starting flow is: exact name or approved generic synonym → recognized identity → existing question-specific grading. Unknown spelling → at most three plausible names → player confirms or edits → existing grading.

For example, `propranalol` can prompt “Did you mean propranolol?” A valid entry such as `propofol` remains propofol, even if propranolol is the expected answer. `Prednisone` and `prednisolone` remain separate. So do `metoprolol succinate` and `metoprolol tartrate`, different insulin types, and an ingredient versus a whole combination.

Fuzzy matching never uses the current question's correct answers to choose a candidate. Limit suggestions to the entire course vocabulary if desired, while still recognizing exact names across the full dictionary. Displaying drug classes in a quiz correction dialog can reveal clues, so the suggested dialog shows names only.

Aliases are verified generic-name variants, not a manually enumerated typo list. The matcher generates plausible misspellings algorithmically, so the database does not need thousands of possible incorrect spellings. Ambiguous abbreviations and brand names are not added by this package.

Do not globally strip salt names, release qualifiers, numbers, prodrug names, human/animal insulin descriptors or combination components. Some distinctions can be relaxed for an individual question, but the game author must define that explicitly.

## Optional reference code

The included JavaScript module exports `createDrugMatcher`, `normalizeDrugName` and `editDistance`. It has no network calls, external dependencies, answer-key access, scoring, timer or persistence behavior. Fuzzy matching, alias acceptance and flexible combination parsing are disabled by default; adopting any of them is a separate integration decision.

After agreeing the behavior, an example local use is:

```js
import {createDrugMatcher} from './reference_matcher.mjs';
const matcher = createDrugMatcher(catalog, {
  enableFuzzy: true,
  acceptAliases: true,
  allowCombinationSeparators: true,
  allowReorderedComponents: true
});
const result = matcher.recognize('propranalol');
// result.status === 'needs_confirmation'; this does not grade an answer.
```

An optional `suggestionDrugIds` array restricts fuzzy suggestions to a stable course-wide vocabulary. Exact names elsewhere in the dictionary still retain their identities. The reference implementation is conservative: word boundaries, numeric qualifiers and release-form tokens are preserved; unknown combinations require their full component sets. It does not implement universal pharmaceutical equivalence.

Run `node test_reference_matcher.mjs` from the extracted package directory. A supported recent Node.js runtime is sufficient. The reference is supplied for review; keep a working existing implementation if it already meets the agreed requirements.

## Validation and research limits

The delivered catalog passed validation of all keywords used by its schema, unique IDs, source references, drug/class links, hierarchy cycles, descendant counts, combination components and reciprocal confusion guards. There are no exact-name collisions or unresolved class assignments in this build. The reference matcher passed 38 scenario tests and 3,330 exact-identity checks.

These checks cover nomenclature structure and the reference algorithm. Your game's UI, timer, attempt count, scoring, saved progress and existing question rules were unavailable and have not been tested. The handoff prompt specifies the checks to perform inside that project.

The main name source is the NLM RxNorm release dated 05-Oct-2026. The ingredient-class source reports ATC version 2026_01_28. Data were retrieved on 25 October 2026. International additions were checked individually against the WHO Collaborating Centre's ATC index. WHO eEML matches are exact name-only cross-checks, not claims that every matched formulation is recommended or a complete EML reconstruction. Its detailed indications, age groups and formulations were not imported.

The broad catalog is intentionally larger than a current common-medicines formulary. Current availability, approval status and local prescribing frequency were not assessed. A current terminology concept can describe a historical or region-specific medicine. Refreshing the sources requires review and versioning; the JSON does not automatically update itself.

The JSON includes the requested NLM attribution. No organizational endorsement is implied. Source-specific rights remain with their owners; the normalized RxNorm names and codes are NLM public-domain terminology.
