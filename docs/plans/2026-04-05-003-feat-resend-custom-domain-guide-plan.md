---
title: "feat: Add Resend custom domain setup guide"
type: feat
status: active
date: 2026-04-05
---

# feat: Add Resend custom domain setup guide

## Overview

Write a setup guide explaining how to configure a custom domain in Resend so meal plan emails can be sent to all household members, not just the account owner.

## Problem Frame

Resend's free tier sends from `onboarding@resend.dev`, which only delivers to the account owner's email address. Users who want to email meal plans to other household members (spouse, roommates) need to verify a custom domain. The README mentions this in one line but doesn't walk through the process.

Related: dancj/meal-assistant#20

## Requirements Trace

- R1. Step-by-step guide for verifying a custom domain in Resend
- R2. Instructions for updating `EMAIL_FROM` and `EMAIL_RECIPIENTS` env vars
- R3. Verification steps to confirm the setup works
- R4. README references the guide

## Scope Boundaries

- No code changes — documentation only
- No changes to the email implementation — it already supports custom domains and multiple recipients
- No Resend API integration beyond what already exists

## Key Technical Decisions

- **Standalone guide in `docs/`** rather than expanding the README — keeps the README concise while providing detailed instructions for those who need them. Follows the pattern of `docs/api.md` and `docs/nanoclaw-setup.md`.

## Implementation Units

- [ ] **Unit 1: Write the custom domain guide**

**Goal:** Create `docs/resend-custom-domain.md` with setup instructions.

**Requirements:** R1, R2, R3

**Dependencies:** None

**Files:**
- Create: `docs/resend-custom-domain.md`

**Approach:**
- Cover: why it's needed (free tier limitation), Resend dashboard steps (add domain, add DNS records, verify), updating env vars (`EMAIL_FROM` to custom domain address, `EMAIL_RECIPIENTS` to household members), testing via the generate page, troubleshooting common issues
- Reference the existing env vars from `.env.example`
- Link to Resend's official domain verification docs

**Test expectation:** none — documentation only

**Verification:**
- `docs/resend-custom-domain.md` exists with clear, actionable steps

- [ ] **Unit 2: Reference the guide from README**

**Goal:** Update the README's Resend note to link to the new guide.

**Requirements:** R4

**Dependencies:** Unit 1

**Files:**
- Modify: `README.md`

**Approach:**
- Update the existing note at the bottom of the README (currently links directly to Resend docs) to also link to the local guide
- Keep it brief — one additional sentence or link

**Test expectation:** none — documentation only

**Verification:**
- README links to `docs/resend-custom-domain.md`

## Sources & References

- Related issue: dancj/meal-assistant#20
- Email implementation: `src/lib/email.ts`
- Env vars: `.env.example`
- Resend docs: https://resend.com/docs/dashboard/domains/introduction
