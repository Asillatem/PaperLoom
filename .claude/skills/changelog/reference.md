# Changelog Reference

## File Format

The changelog follows [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
# Changelog

## [Unreleased]

### Added
- New feature description

### Changed
- Modification description

### Fixed
- Bug fix description

### Removed
- Removed feature description

---

## 2026-01-06

### Added
- Implement inline text highlighting for PDFs

### Fixed
- Fix highlights persisting across different PDFs
```

## Entry Categories

| Category | Use For |
|----------|---------|
| **Added** | New features, capabilities |
| **Changed** | Modifications to existing features |
| **Fixed** | Bug fixes |
| **Removed** | Removed features or deprecated code |

## Mapping Task Tags to Categories

| Task Tag | Changelog Category |
|----------|-------------------|
| `#feature` | Added |
| `#enhancement` | Changed |
| `#bug` | Fixed |
| `#refactor` | Changed |
| `#docs` | Changed |
| `#removed` | Removed |

## Rules

1. Create `.claude/CHANGELOG.md` if it doesn't exist
2. Group entries by date (newest first)
3. Use present tense ("Add feature" not "Added feature")
4. Keep entries concise but descriptive
5. Link to related tasks or PRs when available

## Integration with PM Skill

When `/pm done <task>` is called:
1. PM skill moves task to Done
2. Changelog skill should be invoked to log the completion
3. Entry is added under today's date with appropriate category
