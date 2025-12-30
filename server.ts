import { Elysia, t } from "elysia";
// import 'dotenv/config';
import { loadUsers, saveUsers } from "./src/stores/user";
import { githubAuth } from "./src/routes/github";

// interface GitHubUser {
//   id: number;
//   login: string;
//   avatar_url: string;
//   html_url: string;
// }
if (
  !process.env.GITHUB_CLIENT_ID ||
  !process.env.GITHUB_CLIENT_SECRET ||
  !process.env.OAUTH_BASE_URL
) 
{
  console.warn("[WARN] GitHub OAuth env vars are not fully set");
}
const app = new Elysia()
  .post(
    "/register",
    ({ body }) => {
      const { userId, username } = body;
      const users = loadUsers();

      if (users[userId]) {
        return {
          success: false,
          message: `You already have an account, ${username} 🦼`,
        };
      }
      users[userId] = {
        jades: 1600,
        credits: 10000,
        pity: 0,
        xp: 0,
        level: 1,
        registeredAt: new Date().toISOString(),
        power: 300,
        lastPowerUpdate: Date.now(),
        lastDaily: 0,
        stats: {
          atk: 20,
          def: 10,
          maxHP: 100,
          critRate: 0.05,
          critDmg: 1.5,
          spd: 96,
        },
      };
      saveUsers(users);
      console.log(
        `[REGISTER] ${username} (${userId}) @ ${new Date().toLocaleString()}`
      );

      return {
        success: true,
        message:
          "Successfully registered an account!\nYou received **1600 jades** and **10,000 credits** as a starting gift.",
      };
    },
    {
      body: t.Object({
        userId: t.String(),
        username: t.String(),
      }),
    }
  )
  .get("/user/:id", ({ params: { id } }) => {
      const users = loadUsers();
      const user = users[id];

      if (!user) {
          return new Response(JSON.stringify({ error: "Elysia Can't find your user" }), {
              status: 404,
              headers: { "Content-Type": "application/json" }
          });
      }
      return user; 
  })

  app.use(githubAuth)
  .listen(21000);
console.log("你好, 世界!")
console.log("Elysia is Listening on http://localhost:21000");
