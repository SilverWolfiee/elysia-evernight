import { Elysia, t } from "elysia";
// import 'dotenv/config';

import { githubAuth } from "./src/routes/github";
import { osuAuth } from "./src/routes/osu";
import {fnaf} from "./src/routes/fnafmml"

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
  .use(osuAuth)
  .use(githubAuth)
  .use(fnaf)
  .listen({
    port: Number(process.env.PORT) || 21000,
    hostname: '0.0.0.0' 
   });

console.log("你好, 世界!")
console.log("Elysia is Listening on port 21000");
