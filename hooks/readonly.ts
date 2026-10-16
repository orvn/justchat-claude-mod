const SAFE = new Set([
  'ls', 'cat', 'head', 'tail', 'grep', 'rg', 'ag', 'wc', 'file', 'stat', 'pwd',
  'which', 'type', 'echo', 'printf', 'tree', 'du', 'df', 'diff', 'sort', 'uniq',
  'cut', 'tr', 'jq', 'basename', 'dirname', 'realpath', 'date', 'env', 'uname',
  'whoami', 'true', 'column', 'nl', 'less', 'more', 'fd', 'find', 'sed', 'git',
])

const SAFE_GIT = new Set([
  'status', 'log', 'diff', 'show', 'blame', 'grep', 'ls-files', 'rev-parse',
  'describe', 'shortlog', 'reflog', 'branch', 'tag', 'remote', 'config',
])

const isSafeSegment = (segment: string) => {
  const words = segment.trim().split(/\s+/).filter(Boolean)
  const [cmd, sub] = words

  if (cmd === undefined) {
    return true
  }
  if (!SAFE.has(cmd)) {
    return false
  }
  if (cmd === 'find') {
    return !words.some(w => /^-(delete|exec|execdir|ok|okdir|fprint|fls)/.test(w))
  }
  if (cmd === 'sed') {
    return !words.some(w => /^-[a-zA-Z]*i/.test(w) || w === '--in-place')
  }
  if (cmd === 'git') {
    if (sub === undefined || !SAFE_GIT.has(sub)) {
      return false
    }
    if (sub === 'branch' || sub === 'tag' || sub === 'remote') {
      return words.slice(2).every(w => /^-(v|vv|a|r|l|-list|-all|-verbose)$/.test(w))
    }
    if (sub === 'config') {
      return words.slice(2).some(w => /^(--get|--get-all|--list|-l)$/.test(w))
    }
  }

  return true
}

// Any redirection, substitution or an unknown command is not read-only
export const isReadOnlyCommand = (command: string) => {
  const stripped = command.replace(/\d?>\s*\/dev\/null/g, '').replace(/2>&1/g, '')

  if (/[>`]|\$\(|<\(/.test(stripped)) {
    return false
  }

  return stripped.split(/&&|\|\||[|;\n]/).every(isSafeSegment)
}
