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


## How it works

`/justchat` supresses non-chat behavior in two ways:

1. **Instruction:** Every prompt carries a hidden instruction: discuss, explain, compare, give opinions. No file edits, no state-changing commands, no implementation plans. Short snippets are fine when they illustrate a point

2. **Blocking:** Instruction alone isn't a guarantee, so tools are allowlisted while chat mode is on:
  - Allowed: Read, Grep, Glob, LSP, web search and fetch, tool search, MCP resource reads, task and agent lists, AskUserQuestion, Agent and Skill (their own calls are checked too)
- Bash: only read-only commands, such as `ls`, `cat`, `grep`, `find` without `-delete` or `-exec`, `sed` without `-i`, and read-only `git`. Redirects, command substitution and unknown commands are refused
- Everything else is refused, including Edit, Write, Monitor, Workflow and every MCP tool (MCP tools give no read-only signal before they run, so read-only ones are blocked too)

When a call is refused, Claude is told why and asked to discuss instead or to suggest leaving chat mode

Chat mode persists through changing session IDs, which can happen in a single chat.

## Development

Run it from a clone for one session. 
Run `./scripts/setup.sh` once after cloning.

```sh
claude --plugin-dir .
```

Saving a file reloads the mod in place, this can be checked with:
```sh
claude plugin validate .
claude plugin test .
```

### Structure
- `hooks/register.tsx`- Hooks, incl. command, tool guard, reply line, band, etc.
- `hooks/copy.ts`: Prompt instruction
- `hooks/readonly.ts`: Allowlist and the read-only shell check
- `types/index.d.ts`: Session state contract
- `tests/`: Tests (run by `claude plugin test`)


### Conventional Commits

Commits must use a conventional prefix, `.githooks/` rejects anything else. Allowed types: `feat`, `fix`, `hotfix`, `refactor`, `style`, `chore`, `cleanup`, `perf`, `test`, `docs`, `content`

`changelog.md` is generated with [git-cliff](https://git-cliff.org):

```sh
git cliff -o changelog.md
```
