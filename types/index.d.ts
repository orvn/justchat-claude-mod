export type ChatFlag = boolean

declare module 'claude-code' {
  interface PluginState {
    justchat: { isOn: ChatFlag; isAsking: ChatFlag; hasJustLeft: ChatFlag; persistedSessionId: string | null }
  }
}
