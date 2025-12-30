import { Elysia } from "elysia";


const pendingLogins = new Map<string, any>();

export const githubAuth = new Elysia({ name: "github-auth" })


  .get("/github/link", ({ query }) => {
    const { userId } = query as { userId?: string };
    if (!userId) return { success: false, message: "Missing userId" };

    const githubUrl =
      "https://github.com/login/oauth/authorize" +
      `?client_id=${process.env.GITHUB_CLIENT_ID}` +
      `&redirect_uri=${process.env.OAUTH_BASE_URL}` +
      `&scope=read:user` +
      `&state=${userId}`; 

    return { success: true, url: githubUrl };
  })


  .get("/auth/github/callback", async ({ query }) => {
    const { code, state } = query as { code?: string; state?: string }; // 'state' is the userId

    if (!code || !state) return "Invalid OAuth callback.";

    // Exchange Code for Token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new URLSearchParams({
          client_id: process.env.GITHUB_CLIENT_ID!,
          client_secret: process.env.GITHUB_CLIENT_SECRET!,
          code,
        }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) return "Failed to retrieve access token.";

    // Fetch GitHub Profile
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "User-Agent": "Evernight-Bot",
      },
    });

    const githubUser = (await userRes.json()) as any;

    // Store in memory for the bot
    pendingLogins.set(state, {
        id: githubUser.id,
        username: githubUser.login,
        avatar: githubUser.avatar_url,
        profileUrl: githubUser.html_url,
        linkedAt: new Date().toISOString(),
        repos: githubUser.public_repos,
        followers: githubUser.followers,
        following: githubUser.following,
        bio: githubUser.bio,
        
    });
    
    console.log(`[GITHUB] Received data for ${githubUser.login} (ID: ${state}). Waiting for pickup...`);


    return new Response(`
      <html>
        <body style="background-color: #1a1b26; color: white; font-family: sans-serif; text-align: center; padding-top: 50px;">
          <h1>Linked Successfully!</h1>
          <p>Verified: <b>${githubUser.login}</b></p>
          <p>You can close this tab and return to Discord.</p>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } });
  })

  
  .get("/github/retrieve/:userId", ({ params: { userId } }) => {
      const data = pendingLogins.get(userId);
      
      if (!data) {
          return { success: false, message: "No pending login found. Did you authorize on the website?" };
      }

      // Clean up memory
      pendingLogins.delete(userId);

      return { success: true, data };
  });