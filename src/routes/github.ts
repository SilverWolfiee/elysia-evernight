import {Elysia} from "elysia"
import { loadUsers, saveUsers } from "../stores/user.ts"
interface githubUser{
    id : number;
    login : string;
    avatar_url : string;
    html_url : string

}
export const  githubAuth = new Elysia({name : "github-auth"})
.get("/linkgithub", ({ query }) => {
    const { userId } = query as { userId?: string };

    if (!userId) {
      return { success: false, message: "Missing userId" };
    }

    const githubUrl =
      "https://github.com/login/oauth/authorize" +
      `?client_id=${process.env.GITHUB_CLIENT_ID}` +
      `&redirect_uri=${process.env.OAUTH_BASE_URL}` +
      `&scope=read:user` +
      `&state=${userId}`;

    return {
      success: true,
      url: githubUrl,
    };
  })
  //GitHub callback
  .get("/auth/github/callback", async ({ query }) => {
    const { code, state } = query as {
      code?: string;
      state?: string;
    };

    if (!code || !state) {
      return "Invalid OAuth callback.";
    }
    // Exchange code for access token
    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new URLSearchParams({
          client_id: process.env.GITHUB_CLIENT_ID!,
          client_secret: process.env.GITHUB_CLIENT_SECRET!,
          code,
        }),
      }
    );
    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
    };
    if (!tokenData.access_token) {
      return "Failed to retrieve access token.";
    }
    // Fetch GitHub user profile
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "User-Agent": "Evernight-Bot",
      },
    });
    const githubUser = (await userRes.json()) as githubUser;
    const users = loadUsers();
    if (!users[state]) {
      return "User not found.";
    }
    users[state].github = {
      id: githubUser.id,
      username: githubUser.login,
      avatar: githubUser.avatar_url,
      profileUrl: githubUser.html_url,
      linkedAt: new Date().toISOString(),
    };
    saveUsers(users);
    console.log(
      `[GITHUB LINK] ${githubUser.login} → Discord ${state}`
    );
    return "GitHub account linked! You may close this tab.";
  });