import { Elysia, t } from "elysia";
// import 'dotenv/config';
import { loadUsers, saveUsers } from "./src/stores/user";
import { githubAuth } from "./src/routes/github";
import { osuAuth } from "./src/routes/osu";

import os from "os"
if(os.platform()=== "win32"){
  console.log("Here's a nickel kid, GET YOURSELF A FCKING REAL OS, STOP USING WINSLOP")
  process.exit(1)
}

if (
  !process.env.GITHUB_CLIENT_ID ||
  !process.env.GITHUB_CLIENT_SECRET ||
  !process.env.OAUTH_BASE_URL
) 
{
  console.warn("[WARN] GitHub OAuth env vars are not fully set");
}
const app = new Elysia()
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
  .use(osuAuth)
  .use(githubAuth)
  .listen(21000);

console.log("你好, 世界!")
console.log("Elysia is Listening on port 21000");
