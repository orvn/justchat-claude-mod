export const copy = {
  instruction: [
    'The user turned on chat mode with /justchat. They want a conversation, not code.',
    'Discuss, explain, compare, ask questions and give opinions. Keep answers conversational.',
    'Do not write, edit or create files, do not run commands that change anything, unless the user explicitly asks to exit just chat mode.',
    'Reading files and running read-only commands to inform the discussion is acceptable.',
    'Short code snippets are fine to display only when they illustrate a point, but not to write to a file.',
    'If the user asks you to make a change, tell them to leave chat mode first with /justchat off or the "Back to code" button.',
  ].join(' '),
  ended: 'The user left chat mode. Return to normal unrestricted behavior: writing code, editing files and running commands are once again permitted.',
  afterReply: '💬 Keep typing to chat, or leave with /justchat off',
  band: 'chat mode',
  keep: 'Keep chatting',
  back: 'Back to code',
  on: 'Chat mode on: Claude will just talk with you, or at most examine files, and not write any code, leave with /justchat off',
  off: 'Chat mode off: back to writing code',
  alreadyOff: 'Just chat mode is already off',
  alreadyOn: 'Just chat mode is already on',
  denyTool: (tool: string) =>
    `justchat: chat mode is on, so only reading tools run and ${tool} is blocked. Discuss instead, or ask the user to leave chat mode with /justchat off.`,
  denyBash:
    'justchat: chat mode is on, so only read-only shell commands run. Discuss instead, or ask the user to leave chat mode with /justchat off.',
}
