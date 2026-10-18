import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { copy } from './copy'
import { isAllowedCall } from './readonly'

const isOn = atom({ plugin: 'justchat', key: 'isOn' } as const, false)
const isAsking = atom({ plugin: 'justchat', key: 'isAsking' } as const, false)
const hasJustLeft = atom({ plugin: 'justchat', key: 'hasJustLeft' } as const, false)
const persistedSessionId = atom({ plugin: 'justchat', key: 'persistedSessionId' } as const, null)

// Newest marker in the transcript decides the mode
const isOnPersisted = async ($: EngineInterface) => {
  const messages = await $.session.messages()

  for (let i = messages.length - 1; i >= 0; i--) {
    const text = messages[i]?.text ?? ''
    const on = text.lastIndexOf(copy.persistTagOn)
    const off = text.lastIndexOf(copy.persistTagOff)

    if (on !== -1 || off !== -1) {
      return on > off
    }
  }

  return false
}

// Interrupted session clears into a new id, rebuilds from the conversation
const persistSession = async ($: EngineInterface) => {
  try {
    const id = await $.session.id()

    if ((await read($, persistedSessionId)) === id) {
      return
    }

    const restored = await isOnPersisted($)
    await update($, persistedSessionId, () => id)
    await update($, isOn, () => restored)
    await update($, isAsking, () => false)
    await update($, hasJustLeft, () => false)
  } catch {
    // Keep the current state rather than drop the hook
  }
}

const persistMode = async ($: EngineInterface, text: string) => {
  try {
    await $.session.append({ message: { type: 'user', content: [{ type: 'text', text }] } })
  } catch {
    // Mid-turn appends can be refused, the next prompt's context carries the tag anyway
  }
}

const enter = async ($: EngineInterface) => {
  await update($, isOn, () => true)
  await update($, isAsking, () => false)
  await update($, hasJustLeft, () => false)
  await persistMode($, copy.persistMarkOn)
}

const leave = async ($: EngineInterface) => {
  await update($, isOn, () => false)
  await update($, isAsking, () => false)
  await update($, hasJustLeft, () => true)
  await persistMode($, copy.persistMarkOff)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'justchat',
      description: 'Talk things through without Claude writing code',
      argumentHint: '[off | message]',
    })
    await persistSession($)

    return next(e)
  })

  on('command.run', { command: 'justchat' }, async ($, e) => {
    await persistSession($)
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
    await persistSession($)

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
    await persistSession($)

    if (!(await read($, isOn))) {
      return next(e)
    }
    if (e.tool === 'Bash') {
      return isAllowedCall(e.tool, e.command) ? next(e) : { deny: copy.denyBash }
    }

    return isAllowedCall(e.tool) ? next(e) : { deny: copy.denyTool(e.tool) }
  }).catch(($, e, next) =>
    next.called ? next(e) : { deny: 'justchat: its write guard failed, so the call is blocked.' },
  )

  on('turn.complete', async ($, e, next) => {
    await persistSession($)
    const done = await next(e)

    if (e.agentId !== undefined || e.reason !== 'answer' || !(await read($, isOn))) {
      return done
    }

    await update($, isAsking, () => true)

    return { ...done, text: copy.afterReply }
  })

  on('session.compact', async ($, e, next) => {
    const done = await next(e)

    if (await read($, isOn)) {
      await persistMode($, copy.persistMarkOn)
    }

    return done
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    await persistSession($)

    if (e.props.hasSurvey || !(await read($, isOn))) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const asking = await read($, isAsking)

    return (
      <Box
        borderStyle="round"
        borderColor="suggestion"
        paddingX={1}
        justifyContent="space-between"
        flexGrow={1}
      >
        <Box gap={1} flexShrink={1} overflow="hidden">
          <Text bold color="inverseText" backgroundColor="suggestion" wrap="truncate">
            {copy.band}
          </Text>
          <Text color="suggestion" wrap="truncate-end">
            {copy.bandHint}
          </Text>
        </Box>
        <Box gap={1} flexShrink={0}>
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
      </Box>
    )
  })
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    await persistSession($)

    if (!(await read($, isOn))) {
      return next(e)
    }

    return next({ ...e, props: { ...e.props, modes: [copy.footerMode, ...e.props.modes] } })
  })
}
