# Project Manager Examples

## View Tasks
```
/pm
/pm status
/pm show
```

## Add Tasks
```
/pm add Implement user authentication #backend #feature
/pm add Fix login button not working #frontend #bug
/pm add Update README with API docs #docs
```

## Move Tasks
```
/pm start Implement user authentication
/pm done Implement user authentication
/pm back Fix login button not working
```

## Planning Session
```
/pm plan Add dark mode support
```
This will:
1. Discuss the feature requirements
2. Break it into specific tasks
3. Add all tasks to Backlog

## Example Workflow

1. Start session: `/pm` to see current tasks
2. Pick a task: `/pm start Fix login button`
3. Work on it...
4. Complete: `/pm done Fix login button`
5. Add new task found during work: `/pm add Refactor auth module #backend`
