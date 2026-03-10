# vpush

Push and pull files to your VPS servers. No Git, no SSH keys — just `vpush`.

## Install

```bash
npm install -g vpush
```

## Quick Start

```bash
# Set your server (default: https://vpush.tech)
vpush server https://vpush.tech

# Clone a project
vpush samuel/my-api

# Make changes, then push
vpush push

# On another machine, pull the latest
vpush pull
```

## Commands

| Command | Description |
|---|---|
| `vpush <user/project>` | Clone a project to your machine |
| `vpush push` | Upload changed files to VPush |
| `vpush pull` | Download latest files from VPush |
| `vpush status` | Show current project and server |
| `vpush server <url>` | Set your VPush server URL |

## How It Works

1. Create a free account at [vpush.tech](https://vpush.tech)
2. Create a project and set a PIN
3. Clone it with `vpush yourname/project`
4. Push and pull files from any machine

No tokens, no SSH keys, no complicated setup. Just a username, project name, and a 4-digit PIN.

## License

MIT
