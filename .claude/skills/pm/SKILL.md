---
name: pm
description: Project manager with kanban board (Backlog, Doing, Done). Use when asked to view tasks, add tasks, start/finish tasks, or plan features. Prevents agents from working on tasks already in progress.
allowed-tools: Read, Edit, Write, Glob
---

# Project Manager Skill

Manage project tasks using a kanban-style board (Backlog, Doing, Done).

## Task Board Location

Tasks are stored in `.claude/tasks.md`

## Agent Coordination

**CRITICAL:** Before starting any task:
1. Read `.claude/tasks.md` to check the **Doing** section
2. Do NOT work on tasks already in **Doing** - another agent is handling them
3. Move your task from Backlog to Doing before starting work
4. Move to Done immediately when finished

## Available Commands

- `/pm` or `/pm status` - View all tasks
- `/pm add <task> #tag` - Add task to Backlog
- `/pm start <task>` - Move task to Doing (claim it)
- `/pm done <task>` - Move task to Done
- `/pm back <task>` - Move task back to Backlog
- `/pm plan <feature>` - Break down feature into tasks

## Quick Reference

See [reference.md](./reference.md) for task file format and detailed usage.

## Arguments

$ARGUMENTS
