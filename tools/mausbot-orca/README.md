> Vendored từ `/home/vif/tuan-vu/intec-kit/packages/mausbot-orca` @ commit `29a60c9`
> (feat(bridge): add watcher-first mausbot Orca bridge). Source of truth cho team
> TMS; cập nhật = re-copy src+tests từ intec-kit rồi `npm run build`.

# mausbot-orca

Watcher-first bridge from a mausbot chat to Orca orchestration. A coordinator bot
submits a TaskSpec; a systemd watcher owns the Orca Run, Task, Dispatch, wait,
evidence gate, one retry and the chat milestones. The LLM appears at intake and
final synthesis only.

## Install

Từ root repo, một lệnh:

```bash
npm run setup:bridge
```

Script tự cài dependency nếu thiếu, build, `npm link`, tạo config mẫu, ghi
systemd user unit, `enable` service, và start nếu config đã có project thật.
Sau đó sửa config rồi start:

```bash
$EDITOR ~/.config/mausbot-orca/config.json
systemctl --user start mausbot-orca.service
journalctl --user -u mausbot-orca -f
```

Cài thủ công (không dùng systemd):

```bash
npm install
npm run build
npm link ./packages/mausbot-orca   # puts `mausbot-orca` on PATH
mausbot-orca init                  # writes ~/.config/mausbot-orca/config.json
```

### Bot discovery

`intec install --skill mausbot-orca` copies the skill into each harness skill
dir; a bot reads `name`/`description` at session start and the full `SKILL.md`
when it selects the skill. Open a new session after syncing.

- Direct `pi`, `omp`, `codex`, `claude` sessions: the copies under
  `~/.pi/agent/skills`, `~/.omp/agent/skills`, `~/.codex/skills`,
  `~/.claude/skills` apply.
- OpenMausbot/MausBot does **not** import `~/.pi` or `~/.omp`; its native roots
  are `~/.codex/skills`, `~/.agents/skills`, `/etc/codex/skills` (and
  `~/.claude/skills` when `claudeUserSkills` is on). Restart `mausbot.service`
  or open the bot UI to rescan, then enable `mausbot-orca` for the **coordinator
  bot only**.
- `mausbot-orca` must be on the bot process PATH and the project config must be
  real; a sample config gives exit `2`/`4` on submit.

Prerequisites: Orca 1.4.263 or newer with a running runtime, a registered repo,
and the worker agents installed (`orca repo list --json`, `orca agent installed --json`).
Set Orca's new-agent-tab behavior so workers do not open permission prompts; a
headless coordinator cannot approve them.

## Config

`~/.config/mausbot-orca/config.json`:

```json
{
  "projects": {
    "tms": {
      "repo": "id:repo_123",
      "path": "/home/you/work/tms",
      "agent": "claude",
      "base_branch": "develop",
      "setup": "run",
      "check": "pnpm test --filter api",
      "deny": ["**/migrations/**"]
    }
  },
  "defaults": {
    "max_attempts": 2,
    "wait_timeout_ms": 30000,
    "approval_timeout_ms": 1800000,
    "gate_timeout_ms": 1800000
  },
  "allow": { "users": [] }
}
```

`repo` is an Orca selector. `path` is the coordinator terminal worktree.
`check` is the only gate command and must exit 0 for a pass. `allow`/`deny` are
default scope globs; a TaskSpec `scope` adds to them, deny wins.

## Commands

| Command | Purpose |
|---|---|
| `mausbot-orca submit --thread ID --project NAME [--agent ID] --spec-file FILE\|-` | Validate and create Run/Task; queue the Dispatch |
| `mausbot-orca answer --thread ID [--text TEXT\|-]` | Route a chat answer to a pending worker question or escalation |
| `mausbot-orca watch [--once]` | Run the systemd watcher loop |
| `mausbot-orca status [--json]` | Coordinator binding and task pointers |
| `mausbot-orca projects` | Print the project registry |
| `mausbot-orca init [--force]` | Write a sample config |

Exit codes: `0` ok, `2` invalid input, `3` duplicate request id, `4` watcher
unavailable.

## systemd

Copy `systemd/mausbot-orca.service`, replace `/path/to/intec-kit`, then:

```bash
systemctl --user daemon-reload
systemctl --user enable --now mausbot-orca.service
journalctl --user -u mausbot-orca -f
```

## Behaviour

- `submit` creates the Run (one per project) and Task synchronously, then returns
  the ids. The watcher performs `worker-start` and persists the dispatch id.
- Wait uses a consuming `check --wait` bound to the watcher's coordinator
  terminal. Timeouts are not failures; the watcher waits again.
- Every consumed message id is persisted after successful handling. On restart,
  `inbox` reconstructs any message consumed in a crash window; duplicates are
  ignored by id.
- Gate: run the project `check` command in the worker worktree and compare
  git-derived changed files against the merged allow/deny scope. A failing check,
  a scope violation, or a worker failure triggers one retry with `--retry-of`.
- After the retry budget, the watcher sends an escalation card with `1) retry`
  and `2) dừng`. `answer` routes the choice.
- Chat sends use `openmausbot send --send-id`; a failed send stays in the outbox
  and retries with the same id.
- `consumer_fenced` recreates the coordinator terminal and rebinds every Run with
  `run-use`. A Run owned by another consumer becomes `orphaned`.

## State

Default state dir: `~/.local/state/mausbot-orca/` (`state.json`, `watcher.sock`,
mode 0600). The watcher is the only writer; `submit` and `answer` go through the
Unix socket. `status` only reads.

## Limits

- One watcher per data dir; a second start exits 4 instead of stealing the socket.
- `allow.users` is a policy filter, not peer authentication; the 0700 state dir and 0600 socket are the OS boundary.
- Request ids are 1–128 characters of `A-Z a-z 0-9 . _ -`.
- A gate with an unknown `base_branch` fails closed; fix the branch or omit it.
- One Run per project; `inbox` reconstruction reads the latest 50 messages.
- Text-only chat: no diff or report attachments.
- One approval tap per assignment on the pi engine; mausbot command allowlists
  do not cover pi.
- No auto-merge; a passing task leaves a worktree for the user.
