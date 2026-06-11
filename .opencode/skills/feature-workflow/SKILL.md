# Feature Workflow Skill

## Overview

This skill defines the automated feature development workflow for lazy developers who don't want to organize their API. Agents work together automatically without asking for approval at each step.

## Workflow State Machine

```
proposed
   ↓
pm-review
   ↓
pm-requests-design
   ↓
designer-working
   ↓
pm-approves-design
   ↓
em-review
   ↓ [EM has questions → back to pm-review, loop]
   ↓ [EM approves]
in-development
   ↓
in-qa
   ↓ [bugs found → dev fixes → back to in-qa]
qa-approved
   ↓
final-verification
   ↓
done
```

## Feature Folder Structure

Every feature gets its own folder at `.opencode/workflow/features/<feature-name>/`

```
<feature-name>/
├── status.json          # Always current state + history
├── 01-requirements.md  # PM: Requirements doc
├── 02-design.md         # Designer: Design concept
├── 03-em-review.md      # EM: Feasibility review
├── 04-implementation.md # Dev: Implementation notes
├── 05-test-report.md    # QA: Test results
├── 06-bugs.json         # QA: Bug list
└── 07-final-check.md    # PM + Designer: Final verification
```

## status.json Format

```json
{
  "feature": "<feature-name>",
  "created": "<ISO timestamp>",
  "state": "<current-state>",
  "lastAction": "<description of last action>",
  "lastUpdated": "<ISO timestamp>",
  "history": [
    { "state": "proposed", "time": "...", "by": "user", "action": "Feature requested" }
  ]
}
```

## Agent Responsibilities

| Agent | States They Handle | Output |
|-------|-------------------|--------|
| pm-agent | pm-review, pm-requests-design, pm-approves-design | 01-requirements.md |
| designer-agent | designer-working | 02-design.md |
| em-agent | em-review | 03-em-review.md |
| dev-agent | in-development | 04-implementation.md |
| qa-agent | in-qa | 05-test-report.md, 06-bugs.json |

## Speed & Performance Rules

**Ask user approval first** if:
- Scanning >50 files in one operation
- Full project rebuild required
- Any operation that could take >30 seconds

**Auto-proceed** for:
- Writing docs to feature folder
- Updating status.json
- Small targeted edits (<10 files)

## Workflow Manager Behavior

1. User requests feature → create feature folder → set state to "proposed" → invoke pm-agent
2. After each agent completes → update status.json → respond to user with progress
3. For loops (EM questions, QA bugs) → automatically invoke the correcting agent
4. When state reaches "done" → respond to user with completion summary

## Handoff Rules

- PM passes to Designer after writing requirements and requesting design
- Designer passes back to PM after creating design concept
- PM passes to EM after approving design
- EM loops back to PM if questions, otherwise passes to Dev
- Dev passes to QA after implementation
- QA loops back to Dev if bugs, otherwise passes to PM+Designer
- PM+Designer final check passes to "done"