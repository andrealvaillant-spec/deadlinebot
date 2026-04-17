const { Client, GatewayIntentBits } = require("discord.js");
const cron = require("node-cron");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

require('dotenv').config();
const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

// Liste des clippeurs (username Discord exact)
const CLIPPEURS = [
  "laurent005584", "jeanbaptiste3494", "power_29476", "gowizzus", "caba4526",
  "batultim3555", "maxime_1610", "zan0m", "ykama.", "cheval1465", "r_xphael",
  "wwisppp", "denisweb3", "_juxles_", "wisie_12", "jrc0510", "zeikof_",
  ".quenntin", "lalouwww", "lilah_58361", "gas2805", "harald08", "azox08550",
  "mahmood_7oo_86853", "444pwn", "benn04", "reyven1312_60357", "xarty12345_69818",
  "thebig_ggggg", "leothecrack0374", "yannael_bsn", "stringerbell4", "rexo7",
  "paquitigno_94546", "yakage2226", "999window", "noctyrix._45615", "zac.cque",
  "cactus14.", "_mlle", "eco_master."
];

// Fichier de stockage des strikes
const STRIKES_FILE = "./strikes.json";

function loadStrikes() {
  if (!fs.existsSync(STRIKES_FILE)) {
    fs.writeFileSync(STRIKES_FILE, JSON.stringify({}));
  }
  return JSON.parse(fs.readFileSync(STRIKES_FILE));
}

function saveStrikes(data) {
  fs.writeFileSync(STRIKES_FILE, JSON.stringify(data, null, 2));
}

async function getPostedUsers() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const messages = await channel.messages.fetch({ limit: 100 });
  const postedUsernames = new Set();

  messages.forEach((msg) => {
    if (msg.createdAt >= startOfDay) {
      postedUsernames.add(msg.author.username.toLowerCase());
    }
  });

  return postedUsernames;
}

// Relance à 23h
cron.schedule("0 23 * * *", async () => {
  console.log("⏰ Relance 23h lancée");
  const channel = await client.channels.fetch(CHANNEL_ID);
  const posted = await getPostedUsers();

  const absents = CLIPPEURS.filter((u) => !posted.has(u.toLowerCase()));

  if (absents.length === 0) {
    await channel.send("✅ Tout le monde a posté son deadline check !");
    return;
  }

  const mentions = absents.map((u) => `@${u}`).join(" ");
  await channel.send(
    `⚠️ **RELANCE — Deadline Check**\n\nVous avez jusqu'à minuit pour poster votre check !\n\n${mentions}`
  );
});

// Strike à 00h
cron.schedule("0 0 * * *", async () => {
  console.log("🚨 Attribution des strikes 00h");
  const channel = await client.channels.fetch(CHANNEL_ID);
  const posted = await getPostedUsers();

  const absents = CLIPPEURS.filter((u) => !posted.has(u.toLowerCase()));

  if (absents.length === 0) {
    await channel.send("✅ Aucun strike aujourd'hui, tout le monde a posté !");
    return;
  }

  // Mise à jour du JSON
  const strikes = loadStrikes();
  const today = new Date().toISOString().split("T")[0];

  absents.forEach((u) => {
    if (!strikes[u]) strikes[u] = { total: 0, history: [] };
    strikes[u].total += 1;
    strikes[u].history.push(today);
  });

  saveStrikes(strikes);

  // Message Discord
  const strikeList = absents
    .map((u) => `@${u} — **${strikes[u].total} strike(s)**`)
    .join("\n");

  await channel.send(
    `🚨 **STRIKE — Deadline Check manqué**\n\n${strikeList}`
  );
});

client.once("ready", () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
});

client.login(TOKEN);
