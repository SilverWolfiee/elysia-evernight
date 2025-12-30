# elysia-evernight
A backend server for my Evernight Discord Bot
[Evernight](https://github.com/SilverWolfiee/evernight-bot)

This backend is built using **Elysia.js** and **Bun**.
## Purpose
This server handles:
- Account registration logic
- Shared user data processing
- Future OAuth integrations (e.g. GitHub linking, Osu account linking)
- APIs used by the Discord bot

## Tech Stack
- **Bun** – JavaScript runtime
- **Elysia.js** – Backend framework
- **TypeScript**
### NOTE
This server only works on "real" operating systems, such as GNU/Linux. If you don't have one, sucks to be you i guess, or try WSL idk i never try.



To install dependencies:

```bash
bun install
bun add elysia
```

To run:
```bash
bun run server.ts
```

