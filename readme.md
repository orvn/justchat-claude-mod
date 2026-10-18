![Claude Code mod](https://img.shields.io/badge/Claude_Code-mod-D97757?style=flat&logo=claude&logoColor=white) ![Conventional Commits](https://img.shields.io/badge/Conventional_Commits-FE5196?style=flat&logo=conventionalcommits&logoColor=white)

# `/justchat`

A Claude Code mod that adds the slash command `/justchat`. Running the command puts Claude in chat mode: it chats with you until instructed otherwise, with full context and ability to perform file reads and access web resources.

Claude Code is heavily biased toward multimodal action: editing files, running commands, drafting plans, etc. Sometimes it's important to discuss topics without the (often sudden) diversion toward work implementation. The native `/btw` slash typically only lasts one response, and isn't able to see conversational context or access files.


## Install

This is implemented using official [Claude Mod guidelines](https://code.claude.com/docs/en/plugins/mods/create). As this is a recent (Oct 2026) features, it requires Claude Code version ` <= 2.1.287`. 

During development, clone this repo and install as follows. While in a Claude code terminal session:

```zsh
/plugin install justchat --marketplace ~/justchat-claude-mod
```

Answer `y` to add the marketplace, then pick a scope


## Usage

| Command | Does |
| --- | --- |
| `/justchat` | Turns chat mode on, or off if it's already on |
| `/justchat <message>` | Turns chat mode on and sends the message |
| `/justchat on` | Turns chat mode on |
| `/justchat off` | Turns chat mode off |

While chat mode is on:

- A 💬 band above the prompt shows the mode, with a **Back to code** button
- After each reply, a line under the answer reminds you how to continue or leave, and the band offers **Keep chatting**
- The band's buttons answer `k` and `c` once the band has focus (ctrl+x tab or a click)
