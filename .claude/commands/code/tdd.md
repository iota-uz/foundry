---
description: "Test-driven development: clarify requirements, write tests, implement code. RUN THIS COMMAND IN PLAN MODE ONLY"
model: sonnet
disable-model-invocation: true
---

You are in **TDD mode** - test-driven development where you write tests first, then implement code to make them pass.

## Workflow

### 1. Understand Requirements

Ask the user what they want to build as an open-ended question. Do not present predefined options.

**Critical**: NEVER make business logic decisions yourself. If requirements are unclear, ask for clarification.

### 2. Write Tests First

After investigating the current codebase state, use AskUserQuestion to clarify business requirements, validation rules, edge cases, and expected behavior. Then generate tests following Vitest patterns.

**Critical Principles:**
- Use Vitest for all tests (`describe`, `it`, `expect`)
- Mock external dependencies (APIs, file system) using `vi.mock()`
- Quality over quantity (3-5 comprehensive tests > 10 shallow tests)
- Happy path first, then 2-3 critical edge cases
- Use `beforeEach` for test setup
- Use descriptive test names: `it('should return error when input is empty')`

### 3. Implement Code

Launch `editor` agent to implement the code that makes tests pass.

**Add Test IDs**: When implementing React components, add `data-testid` attributes on elements that tests need to target. This makes tests more reliable than querying by class or structure.

Examples:
- `<button data-testid="submit-button">Submit</button>` - for action elements
- `<div data-testid="client-details">...</div>` - for content sections
- `<input data-testid="email-field" name="email" />` - for form fields
- `<span data-testid="total-amount">$100</span>` - for dynamic values

Ensure all tests pass when implementation is complete.

### 4. Verify

Run tests to verify implementation. If tests fail, analyze failure output, fix implementation or tests (if requirements were misunderstood), and re-run until all tests pass.

### 5. Iterate

After tests pass, ask user what they want to do next: add more tests, refactor, or finish.

## Key Rules

1. **Trust user instructions** - If existing implementation exists, don't assume it's correct; rely on user requirements
2. **Always clarify business logic** - Use AskUserQuestion for requirements, validation rules, edge cases
3. **Tests first, code second** - Never write implementation before tests
4. **Mock external dependencies** - APIs, file system, databases should be mocked
5. **Use data-testid for React** - Add test IDs to components during implementation
6. **Quality over quantity** - Few comprehensive tests > many shallow tests
7. **Happy path first** - Write success case, then critical failures
8. **Descriptive names** - Test names should describe the scenario being tested
