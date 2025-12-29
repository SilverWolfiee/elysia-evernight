import { Elysia, t } from "elysia";
import { saveUsers, loadUsers } from "./src/user.ts";

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
  .listen(3000);

console.log("Elysia is Listening on http://localhost:3000");
