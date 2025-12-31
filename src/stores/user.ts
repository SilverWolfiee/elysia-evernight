import fs from "fs";
import path from "path";

const dataDir = process.env.DATA_DIR ?? "./data";
const filePath = path.resolve(dataDir, "users.json");

export function loadUsers(): Record<string, any> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const users = JSON.parse(fs.readFileSync(filePath, "utf8"));
  let updated = false;

  for (const id in users) {
    const user = users[id];

    if (!user.stats) {
      user.stats = {
        atk: 20,
        def: 10,
        maxHP: 100,
        critRate: 0.05,
        critDmg: 1.5,
        spd: 96,
      };
      updated = true;
    }
    if (user.xp === undefined) {
      user.xp = 0;
      updated = true;
    }
    if (user.level === undefined) {
      user.level = 1;
      updated = true;
    }
    if (user.power === undefined) {
      user.power = 300;
      user.lastPowerUpdate = Date.now();
      updated = true;
    }
  }
  if (updated) {
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
  }
  return users;
}
export function saveUsers(users: Record<string, any>) {
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
}
export type User = {
  jades?: number;
  credits?: number;
  pity?: number;
  xp?: number;
  level?: number;
  registeredAt?: string;
  power?: number;
  lastPowerUpdate?: number;
  lastDaily?: number;

  stats?: {
    atk: number;
    def: number;
    maxHP: number;
    critRate: number;
    critDmg: number;
    spd: number;
  };

  github?: {
    id: number;
    username: string;
    avatar: string;
    profileUrl: string;
    linkedAt: string;
  };
};
// if (!fs.existsSync(filePath)) {
//     console.log(`ERROR: Database not found at ${filePath}`);
// } else {
//     console.log(`SUCCESS: Database loaded from ${filePath}`);
// }