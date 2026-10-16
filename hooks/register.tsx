import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { copy } from './copy'
import { isReadOnlyCommand } from './readonly'

const isOn = atom({ plugin: 'justchat', key: 'isOn' } as const, false)
const isAsking = atom({ plugin: 'justchat', key: 'isAsking' } as const, false)
const hasJustLeft = atom({ plugin: 'justchat', key: 'hasJustLeft' } as const, false)

const WRITE_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit', 'MultiEdit'])

const enter = async ($: EngineInterface) => {
  await update($, isOn, () => true)
  await update($, isAsking, () => false)
  await update($, hasJustLeft, () => false)
}

const leave = async ($: EngineInterface) => {
  await update($, isOn, () => false)
  await update($, isAsking, () => false)
  await update($, hasJustLeft, () => true)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'justchat',
      description: 'Talk things through without Claude writing code',
      argumentHint: '[off | message]',
    })

    return next(e)
  })

  on('command.run', { command: 'justchat' }, async ($, e) => {
    const arg = e.args.trim()
    const wasOn = await read($, isOn)

    if (arg === 'off' || (arg === '' && wasOn)) {
      if (!wasOn) {
        return { text: copy.alreadyOff }
      }
      await leave($)

      return { text: copy.off }
    }

    if (arg === 'on' && wasOn) {
      return { text: copy.alreadyOn }
    }

    await enter($)

    if (arg !== '' && arg !== 'on') {
      void $.prompt.submit({ text: arg, asUser: true })
    }

    return { text: copy.on }
  })

  on('prompt.submit', async ($, e, next) => {
    if (await read($, hasJustLeft)) {
      await update($, hasJustLeft, () => false)

      return next({ ...e, context: [...(e.context ?? []), copy.ended] })
    }

    if (!(await read($, isOn))) {
      return next(e)
    }

    await update($, isAsking, () => false)

    return next({ ...e, context: [...(e.context ?? []), copy.instruction] })
  })

  on('tool.call', async ($, e, next) => {
    if (!(await read($, isOn))) {
      return next(e)
    }
    if (WRITE_TOOLS.has(e.tool)) {
      return { deny: copy.denyWrite(e.tool) }
    }
    if (e.tool === 'Bash' && !isReadOnlyCommand(e.command)) {
      return { deny: copy.denyBash }
    }

    return next(e)
  }).catch(($, e, next) =>
    next.called ? next(e) : { deny: 'justchat: its write guard failed, so the call is blocked.' },
  )

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)

    if (e.agentId !== undefined || e.reason !== 'answer' || !(await read($, isOn))) {
      return done
    }

    await update($, isAsking, () => true)

    return { ...done, text: copy.afterReply }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || !(await read($, isOn))) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const asking = await read($, isAsking)

    return (
      <Box gap={1}>
        <Text color="cyan">💬 {copy.band}</Text>
        {asking && (
          <Button
            key="keep"
            label={copy.keep}
            hotkey="k"
            onPress={() => update($, isAsking, () => false)}
          />
        )}
        <Button
          key="back"
          label={copy.back}
          hotkey="c"
          onPress={async () => {
            await leave($)
            $.ui.toast(copy.off)
          }}
        />
      </Box>
    )
  })
}
