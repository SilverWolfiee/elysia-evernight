import fs from "fs";
import os from "os";

let filePath: string;

if (os.platform() === "win32") {
  filePath = "C:\\Users\\EnDragyy\\evernight-database\\users.json";
} else {
  filePath = "/home/silverwolf/Windows/Users/EnDragyy/evernight-database/users.json";
}

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
