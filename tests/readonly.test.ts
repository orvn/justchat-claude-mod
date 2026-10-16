import { describe, expect, test } from 'claude-code/testing'

import { isReadOnlyCommand } from '../hooks/readonly'

describe('read-only shell check', () => {
  test('allows reads', () => {
    for (const cmd of [
      'ls -la',
      'cat readme.md | head -20',
      'grep -rn foo src 2>/dev/null',
      'git status && git log --oneline -5',
      'git diff HEAD~1',
      'find . -name "*.ts"',
      'sed -n 1,20p hooks/register.tsx',
      'git branch -a',
    ]) {
      expect(isReadOnlyCommand(cmd), cmd).toBe(true)
    }
  })

  test('refuses writes', () => {
    for (const cmd of [
      'rm -rf dist',
      'echo hi > notes.md',
      'cat a >> b',
      'sed -i "" s/a/b/ file',
      'find . -name "*.log" -delete',
      'find . -exec rm {} \;',
      'git commit -m wip',
      'git branch new-feature',
      'git config user.name x',
      'npm install',
      'ls $(rm -rf x)',
      'ls `touch x`',
      'ls; touch x',
      'cat x | tee y',
    ]) {
      expect(isReadOnlyCommand(cmd), cmd).toBe(false)
    }
  })
})
