---
name: changelog
description: Writes changelog entries when tasks are completed. Use after marking a task as done in tasks.md, or when asked to log changes. Maintains CHANGELOG.md with dated entries.
allowed-tools: Read, Edit, Write, Glob
---

# Changelog Skill

Automatically logs completed tasks and changes to `.claude/CHANGELOG.md`.

## Changelog Location

Changelog is stored in `.claude/CHANGELOG.md`

## When to Use

1. After moving a task to **Done** in tasks.md
2. When completing a significant feature or fix
3. When asked to log or document changes

## Available Commands

- `/changelog` - View recent changelog entries
- `/changelog add <description>` - Add a changelog entry
- `/changelog sync` - Scan Done tasks and add missing entries

## Behavior

When a task is marked done:
1. Read the task description from tasks.md
2. Create a concise changelog entry
3. Add to today's date section in CHANGELOG.md
4. Group by type: Added, Changed, Fixed, Removed

## Arguments

$ARGUMENTS
