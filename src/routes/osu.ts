import { Elysia } from "elysia";

// 📬 THE MAILBOX: Temporary storage for logins
const pendingOsuLogins = new Map<string, any>();

interface OsuTokenResponse {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    refresh_token?: string;
    error?: string;
}

export const osuAuth = new Elysia({ name: "osu-auth" })

    // 1. Link Generator 🔗
    .get("/osu/link", ({ query }) => {
        const userId = query.userId as string;
        
        if (!userId) return { success: false, message: "No User ID provided" };

        const clientId = process.env.OSU_CLIENT_ID;
       
        const redirectUri = process.env.OSU_REDIRECT_URI; 

        const url = `https://osu.ppy.sh/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri!)}&response_type=code&scope=public&state=${userId}`;

        return { success: true, url: url };
    })

    .get("/auth/osu/callback", async ({ query, set }) => {
        const { code, state } = query as { code?: string; state?: string };

        if (!code || !state) {
            set.status = 400;
            return "Missing auth code or state";
        }

        try {
            // Exchange Code for Token
            const tokenResponse = await fetch("https://osu.ppy.sh/oauth/token", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json" 
                },
                body: JSON.stringify({
                    client_id: parseInt(process.env.OSU_CLIENT_ID!),
                    client_secret: process.env.OSU_CLIENT_SECRET!,
                    code,
                    grant_type: "authorization_code",
                    redirect_uri: process.env.OSU_REDIRECT_URI!,
                }),
            });

            const tokens = (await tokenResponse.json()) as OsuTokenResponse;
            if (!tokens.access_token) throw new Error("No access token received");

            // Fetch osu! Profile
            const userResponse = await fetch("https://osu.ppy.sh/api/v2/me", {
                headers: { 
                    Authorization: `Bearer ${tokens.access_token}`,
                    // 'x-api-version': '20220705' // Sometimes needed, but usually fine without
                },
            });

            const osuUser = await userResponse.json() as any;

            pendingOsuLogins.set(state, {
                id: osuUser.id,
                username: osuUser.username,
                avatar: osuUser.avatar_url,
                cover: osuUser.cover_url || osuUser.cover?.url,
                country: osuUser.country_code,
                // Stats
                pp: osuUser.statistics?.pp ?? 0,
                globalRank: osuUser.statistics?.global_rank ?? 0,
                countryRank: osuUser.statistics?.country_rank ?? 0,
                accuracy: osuUser.statistics?.hit_accuracy ?? 0,
                playCount: osuUser.statistics?.play_count ?? 0,
                mode: osuUser.playmode,
                linkedAt: new Date().toISOString(),
            });

            console.log(`Received data for ${osuUser.username} (ID: ${state}). Waiting for pickup...`);
            return new Response(`
                <html>
                    <body style="background-color: #ff66aa; color: white; font-family: sans-serif; text-align: center; padding-top: 50px;">
                        <h1>Connected!</h1>
                        <p>Welcome, <b>${osuUser.username}</b>!</p>
                        <p>Your bot is now syncing your profile...</p>
                        <script>setTimeout(() => window.close(), 5000)</script>
                    </body>
                </html>
            `, { headers: { 'Content-Type': 'text/html' } });

        } catch (err) {
            console.error("OSU AUTH ERROR:", err);
            set.status = 500;
            return "Error connecting to osu! servers.";
        }
    })

    .get("/osu/retrieve/:userId", ({ params: { userId } }) => {
        const data = pendingOsuLogins.get(userId);
        if (!data) return { success: false, message: "No pending login found." };
        pendingOsuLogins.delete(userId); 
        return { success: true, data };
    });