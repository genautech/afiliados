# Seedance Failure Log

Running log of every Seedance video prompt that **failed**. Use this to build a personal content-filter map over time — what trips NSFW, what trips IP detection, and what safe alternative worked on retry.

Append-only. Never delete entries — even old ones are useful pattern data.

---

## Entry format

```
### {{shot-id}}
**Date:** {{YYYY-MM-DD}} | **Batch:** batch-{{NN}} | **Models:** {{M1/M2/duo}} | **Genre:** {{action/epic/etc}}
**Failure type:** {{nsfw / ip_detected / quality / timeout}}

**Trigger (suspected):** {{the phrase, ref UUID, or combination you believe caused the failure}}

**Original prompt excerpt:**
> {{the problematic line}}

**Safe rewrite that worked:**
> {{the version that passed}}

**Notes:** {{anything else useful — did genre swap help? did dropping an env ref help? was it transient on retry?}}

---
```

---

## Failures

*(Append entries here as they happen. Group under batch headers if it helps.)*

---

## Known patterns *(curated — promote learnings here once you see them repeated)*

### NSFW
- {{add learnings from your project as you accumulate them}}

### IP detected
- {{add learnings from your project as you accumulate them}}

### Quality / timeout
- {{add learnings}}
