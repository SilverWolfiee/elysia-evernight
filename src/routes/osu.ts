import { Elysia } from "elysia";
import { Beatmap, Performance } from "rosu-pp-js";


const pendingOsuLogins = new Map<string, any>();
let appToken = "";
let tokenExpiresat = 0;

const ModBits: Record<string, number> = {
    NF: 1, EZ: 2, TD: 4, HD: 8, HR: 16, SD: 32, DT: 64, RX: 128, HT: 256, 
    NC: 512, FL: 1024, SO: 4096 
};


function getModString(m: any): string {
    if (typeof m === "string") return m; 
    if (m && m.acronym) return m.acronym; 
    return "";
}

function getModMask(mods: any[]) {
    return mods.reduce((acc, m) => {
        const name = getModString(m);
        let val = ModBits[name] || 0;
        

        if (name === "NC"){
            val |= (ModBits["DT"] || 64);
        }
        return acc + val;
    }, 0);
}

function formatMods(mods: any[]) {
    const list = mods.map(m => getModString(m)).join("");
    return list || "Nomod";
}
async function getAppToken(){
    if(appToken && Date.now()< tokenExpiresat){
        return appToken
    }
    console.log("Refreshing AppToken")
    const res = await fetch("https://osu.ppy.sh/oauth/token", {
        method: "POST",
        headers : {"Content-Type" :  "application/json"},
        body: JSON.stringify({
            client_id: parseInt(process.env.OSU_CLIENT_ID!),
            client_secret: process.env.OSU_CLIENT_SECRET!,
            grant_type: "client_credentials",
            scope: "public"
        }),
    })
    const data = await res.json() as any
    if(!data.access_token){
        throw new Error("Failed to get token")
    }
    appToken = data.access_token
    tokenExpiresat = Date.now()+(data.expires_in * 1000) - 5000
    return appToken
}
interface OsuTokenResponse {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    refresh_token?: string;
    error?: string;
}

export const osuAuth = new Elysia({ name: "osu-auth" })

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
    })
   .get("/osu/latest/:idInput", async ({ params: { idInput }, query, set }) => {
        try {
            const token = await getAppToken();
            const mode = (query.mode as string) || "osu";
            let targetId = idInput;

         
            if (isNaN(Number(idInput))) {
                console.log(`[OSU] resolving username '${idInput}' to ID...`);
                const userRes = await fetch(`https://osu.ppy.sh/api/v2/users/${idInput}?key=username`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!userRes.ok) return { success: false, message: `Could not find user: ${idInput}` };
                const userData = await userRes.json() as any;
                targetId = userData.id;
            }

           
            const res = await fetch(`https://osu.ppy.sh/api/v2/users/${targetId}/scores/recent?include_fails=1&mode=${mode}&limit=1`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const scores = await res.json() as any[];
            if (!scores || scores.length === 0) return { success: false, message: "No recent plays found." };
            
            const score = scores[0]; 
            const map = score.beatmap;
            const mapset = score.beatmapset;

           
            let maxPP = 0;
            let ifFcPP = 0;
            // Classic variables
            let maxPPcl = 0;
            let ifFcPPcl = 0;
            
            let stars = map.difficulty_rating;
            let starscl = 0;

           
            const modsMask = getModMask(score.mods);
            const modsString = formatMods(score.mods);
           
            const classicModsStr = (modsString === "Nomod" ? "" : modsString) + "CL";

            try {
                const mapRes = await fetch(`https://osu.ppy.sh/osu/${map.id}`);
                if (mapRes.ok) {
                    const mapContent = await mapRes.text();
                    const bytes = new TextEncoder().encode(mapContent);
                    const rosuMap = new Beatmap(bytes);     
                    // LAZER CALCULATION
                    
                    const maxCalc = new Performance({ mods: modsMask });
                    const maxPerf = maxCalc.calculate(rosuMap);
                    
                    maxPP = maxPerf.pp;
                    stars = maxPerf.difficulty.stars; 

                    // Stats for "If FC" (Optimistic Mode)
                    const stats = score.statistics;
                    const n300 = stats.count_300 || 0;
                    const n100 = stats.count_100 || 0;
                    const n50 = stats.count_50 || 0;
                    const nMiss = stats.count_miss || 0;
                    const simulated300s = n300 + nMiss; 

                    const ifFcPerf = new Performance({ 
                        mods: modsMask,
                        n300: simulated300s, 
                        n100: n100,          
                        n50: n50,            
                        misses: 0,           
                        combo: maxPerf.difficulty.maxCombo 
                    }).calculate(rosuMap);

                    ifFcPP = ifFcPerf.pp;
                    // CLASSIC CALCULATION
                    try {
                        // Classic Max PP
                        const maxCalcCL = new Performance({ mods: classicModsStr as any }); 
                        const maxPerfCL = maxCalcCL.calculate(rosuMap);
                        maxPPcl = maxPerfCL.pp;
                        starscl = maxPerfCL.difficulty.stars;

                        // Classic "If FC"
                       
                        const ifFcPerfCL = new Performance({ 
                            mods: classicModsStr as any,
                            n300: simulated300s, 
                            n100: n100,          
                            n50: n50, 
                            misses: 0, 
                            combo: maxPerfCL.difficulty.maxCombo 
                        }).calculate(rosuMap);
                        ifFcPPcl = ifFcPerfCL.pp;

                    } catch (classicErr) {
                        console.log("Classic calc failed:", classicErr);
                    }

                    
                    rosuMap.free(); 
                }
            } catch (calcErr) {
                console.error("[PP Calc] Failed:", calcErr);
            }
        
            return {
                success: true,
                data: {
                    user: {
                        id: score.user.id,
                        username: score.user.username,
                        avatar: score.user.avatar_url,
                    },
                    title: mapset.title,
                    artist: mapset.artist,
                    version: map.version, 
                    stars: stars,
                    status: map.status, 
                    cover: mapset.covers['cover@2x'], 
                    url: map.url,
                    rank: score.rank, 
                    
                    // Lazer Data
                    pp: score.pp || 0,
                    maxPP: maxPP,
                    ifFcPP: ifFcPP,
                      
                    // Classic Data 
                  
                    starsClassic: starscl, 
                    maxPPClassic: maxPPcl,
                    ifFcPPClassic: ifFcPPcl,

                    accuracy: score.accuracy * 100,
                    score: score.score,
                    combo: score.max_combo,
                    mods: modsString,
                    count300: score.statistics.count_300 || 0,
                    count100: score.statistics.count_100 || 0,
                    count50: score.statistics.count_50 || 0,
                    countMiss: score.statistics.count_miss || 0,
                    created_at: score.created_at
                }
            };

        } catch (err) {
            console.error(err);
            set.status = 500;
            return { success: false, message: "Error fetching from osu!" };
        }
    });