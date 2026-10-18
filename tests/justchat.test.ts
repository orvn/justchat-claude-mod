import { expect, test } from 'claude-code/testing'

const ORIGIN = { kind: 'composer' } as const
const PRESENTATION = { isFullscreen: false, columns: 120 }
const BAND = {
  plugin: 'justchat',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 4 },
} as const

const runCommand = ($: any, args: string) =>
  $.command.run({ command: 'justchat', args, origin: ORIGIN, presentation: PRESENTATION })

const submit = ($: any, text: string) => $.prompt.submit({ text, wait: false, origin: ORIGIN })

const endTurn = ($: any, extra = {}) =>
  $.turn.complete({
    answer: 'an answer',
    durationMs: 10,
    isAborted: false,
    turnId: 't1',
    reason: 'answer',
    ...extra,
  })

test('chat mode adds the instruction, blocks writes and prompts after replies', async ($, on) => {
  const contexts: (readonly string[] | undefined)[] = []

  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: 's1' }))
  on('session.messages', () => ({ value: [] }) as any)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('prompt.submit', (_, e) => {
    contexts.push(e.context)

    return { text: e.text, context: e.context }
  })
  on('tool.call', () => ({ result: 'ran', text: 'ran' }) as any)
  on('turn.complete', (_, e) => ({ text: e.answer }))

  await $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })

  await submit($, 'before')
  expect(contexts.at(-1)).toBeUndefined()

  expect((await runCommand($, '')).text).toContain('Chat mode on')

  await submit($, 'what do you think of sqlite here?')
  expect(contexts.at(-1)?.[0]).toContain('chat mode')

  const edit = await $.tool.call({ tool: 'Edit', file_path: '/work/a.ts', old_string: 'a', new_string: 'b' } as any)
  expect(edit.isError ?? edit.deny !== undefined).toBe(true)

  const write = await $.tool.call({ tool: 'Bash', command: 'rm -rf dist' } as any)
  expect(write.isError ?? write.deny !== undefined).toBe(true)

  const mcp = await $.tool.call({ tool: 'mcp__drive__update_file', fileId: 'x' } as any)
  expect(mcp.isError ?? mcp.deny !== undefined).toBe(true)

  const monitor = await $.tool.call({ tool: 'Monitor', command: 'rm -rf dist' } as any)
  expect(monitor.isError ?? monitor.deny !== undefined).toBe(true)

  const readFile = await $.tool.call({ tool: 'Read', file_path: '/work/a.ts' } as any)
  expect(readFile.text).toBe('ran')

  const read = await $.tool.call({ tool: 'Bash', command: 'git log --oneline' } as any)
  expect(read.text).toBe('ran')

  expect((await endTurn($)).text).toContain('/justchat off')
  expect((await endTurn($, { agentId: 'sub' })).text).toBe('an answer')

  expect((await runCommand($, 'off')).text).toContain('Chat mode off')

  await submit($, 'now build it')
  expect(contexts.at(-1)?.[0]).toContain('left chat mode')

  await submit($, 'and again')
  expect(contexts.at(-1)).toBeUndefined()

  const edit2 = await $.tool.call({ tool: 'Edit', file_path: '/work/a.ts', old_string: 'a', new_string: 'b' } as any)
  expect(edit2.text).toBe('ran')
  expect((await endTurn($)).text).toBe('an answer')
})

test('off when already off says so', async ($, on) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: 's1' }))
  on('session.messages', () => ({ value: [] }) as any)
  on('command.register', (_, e) => ({ value: { command: e.name } }))

  await $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })
  expect((await runCommand($, 'off')).text).toContain('already off')
})

test('band shows the choice after a reply and Back to code leaves', async ($, on) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: 's1' }))
  on('session.messages', () => ({ value: [] }) as any)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)

    return h(Box, null)
  })
  on('ui.toast', () => ({ value: undefined }) as any)

  await $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    await runCommand($, 'on')
    await endTurn($)

    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: 'CHAT MODE' })).toBeDefined()
    expect(await ui.find({ key: 'keep' })).toBeDefined()

    await ui.press({ key: 'keep' })
    expect(await ui.find({ key: 'keep' })).toBeUndefined()

    await ui.press({ key: 'back' })
    expect(await ui.find({ key: 'back' })).toBeUndefined()
    await ui.unmount()
  }
})

test('chat mode survives a switch to a new session id', async ($, on) => {
  let id = 's1'
  const transcript: { role: 'user'; text: string; toolUses: [] }[] = []
  const contexts: (readonly string[] | undefined)[] = []

  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: id }))
  on('session.messages', () => ({ value: [...transcript] }) as any)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('prompt.submit', (_, e) => {
    contexts.push(e.context)
    transcript.push({ role: 'user', text: [e.text, ...(e.context ?? [])].join('\n'), toolUses: [] })

    return { text: e.text, context: e.context }
  })
  on('tool.call', () => ({ result: 'ran', text: 'ran' }) as any)

  await $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })
  await runCommand($, '')
  await submit($, 'hi')

  id = 's2'
  await submit($, 'still chatting?')
  expect(contexts.at(-1)?.[0]).toContain('[justchat:on]')

  const edit = await $.tool.call({ tool: 'Edit', file_path: '/work/a.ts', old_string: 'a', new_string: 'b' } as any)
  expect(edit.isError ?? edit.deny !== undefined).toBe(true)

  await runCommand($, 'off')
  await submit($, 'build it')
  expect(contexts.at(-1)?.[0]).toContain('[justchat:off]')

  id = 's3'
  await submit($, 'next')
  expect(contexts.at(-1)).toBeUndefined()

  id = 's4'
  transcript.length = 0
  await submit($, 'after clear')
  expect(contexts.at(-1)).toBeUndefined()
})

test('a failing history read keeps the current mode', async ($, on) => {
  const contexts: (readonly string[] | undefined)[] = []

  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: 's1' }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('prompt.submit', (_, e) => {
    contexts.push(e.context)

    return { text: e.text, context: e.context }
  })

  await $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })
  await runCommand($, '')
  await submit($, 'hi')
  expect(contexts.at(-1)?.[0]).toContain('[justchat:on]')
})

test('the footer lists chat mode beside the other modes', async ($, on) => {
  const seen: (readonly string[])[] = []

  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: 's1' }))
  on('session.messages', () => ({ value: [] }) as any)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.render', ($, e) => {
    seen.push((e.props as any).modes)
    const { Box } = $.ui.resolve(e)

    return h(Box, null)
  })

  await $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })
  const FOOTER = { plugin: 'justchat', component: 'SessionMode', props: { modes: ['auto mode on'] } } as const

  await (await $.ui.mount({ ...FOOTER, surface: 'terminal' })).unmount()
  expect(seen.at(-1)).toEqual(['auto mode on'])

  await runCommand($, '')
  await (await $.ui.mount({ ...FOOTER, surface: 'terminal' })).unmount()
  expect(seen.at(-1)).toEqual(['💬 chat mode', 'auto mode on'])
})
