# Project Manager Reference

## Agent Coordination Protocol

When multiple agents work on a project:

1. **Check Doing First**: Always read tasks.md before starting work
2. **Claim Tasks**: Move task to Doing before starting (this "locks" it)
3. **One Task at a Time**: Only have ONE task in Doing per agent
4. **Release on Completion**: Move to Done immediately when finished
5. **Avoid Conflicts**: Never modify a task another agent is working on

## Task File Format

The task board is stored in `.claude/tasks.md` with this structure:

```markdown
# Project Tasks

## Backlog
- [ ] Task description #tag1 #tag2

## Doing
- [ ] Task description #tag

## Done
- [x] Task description #tag (completed: YYYY-MM-DD)
```

## Behavior

### View Tasks (default)
When no arguments or "status"/"show"/"list"/"view":
1. Read `.claude/tasks.md`
2. Show summary with count per column
3. List all tasks grouped by status

### Add Task
When arguments contain "add" followed by task description:
1. Parse task text and any #tags
2. Add to **Backlog** section
3. Confirm addition

### Move Task
- `start <task>` - Backlog → Doing
- `done <task>` or `finish <task>` - Doing → Done (adds completion date)
- `back <task>` - Any → Backlog

### Plan Mode
When arguments contain "plan":
1. Discuss feature with user
2. Break into actionable tasks
3. Add all to Backlog
4. Show updated board

## Tags

Use #tags for categorization:
- `#frontend` - UI/React work
- `#backend` - API/Python work
- `#bug` - Bug fixes
- `#feature` - New features
- `#docs` - Documentation

## Rules

1. Create `.claude/tasks.md` if missing
2. Preserve existing tasks when modifying
3. Add completion date when marking done
4. Keep descriptions concise but clear
