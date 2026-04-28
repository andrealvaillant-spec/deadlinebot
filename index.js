require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require("discord.js");
const cron = require("node-cron");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

const CLIPPEURS = [
  { username: "jeanbaptiste3494", id: "695582447441543228" },
  { username: "gowizzus", id: "1106304129745305692" },
  { username: "zan0m", id: "769635925994635285" },
  { username: "r_xphael", id: "1274481696561172623" },
  { username: "wwisppp", id: "1335715684860166256" },
  { username: "denisweb3", id: "771495349986394133" },
  { username: "_juxles_", id: "577118344667201536" },
  { username: "jrc0510", id: "1196063285519319072" },
  { username: "zeikof_", id: "700796189716512808" },
  { username: ".quenntin", id: "281880856707072000" },
  { username: "lalouwww", id: "980148103355174992" },
  { username: "gas2805", id: "855132579203514408" },
  { username: "harald08", id: "1089135713632649246" },
  { username: "mahmood_7oo_86853", id: "1170372222368632833" },
  { username: "444pwn", id: "782963252078313473" },
  { username: "xarty12345_69818", id: "1296085541661577269" },
  { username: "leothecrack0374", id: "1424111262412968066" },
  { username: "yannael_bsn", id: "1112425970973028503" },
  { username: "stringerbell4", id: "1183913262295814186" },
  { username: "rexo7", id: "659143001221627927" },
  { username: "yakage2226", id: "471335719445725194" },
  { username: "999window", id: "1027622118973775972" },
  { username: "noctyrix._45615", id: "1387348691530285126" },
  { username: "zac.cque", id: "1445749504090308614" },
  { username: "cactus14.", id: "1051840272113340447" },
  { username: "_mlle", id: "1026218057523286016" },
  { username: "eco_master.", id: "855515132616507423" },
  { username: "sup3rsmil3", id: "678683932262137886" },
];

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

function getActiveStrikes(strikesData, username) {
  if (!strikesData[username]) return 0;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return strikesData[username].history.filter((dateStr) => {
    const parts = dateStr.split("/");
    const date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    return date >= thirtyDaysAgo;
  }).length;
}

async function getPostedUsers() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const messages = await channel.messages.fetch({ limit: 100 });
  const postedIds = new Set();
  messages.forEach((msg) => {
    if (msg.createdAt >= since) {
      postedIds.add(msg.author.id);
    }
  });
  return postedIds;
}

function formatMention(clippeur) {
  return clippeur.id ? `<@${clippeur.id}>` : `@${clippeur.username}`;
}

function addStrikes(absents) {
  const strikes = loadStrikes();
  const today = new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
  absents.forEach((u) => {
    if (!strikes[u.username]) strikes[u.username] = { history: [] };
    strikes[u.username].history.push(today);
  });
  saveStrikes(strikes);
  return strikes;
}

client.on(Events.MessageCreate, async (message) => {
  console.log(`Message reçu de ${message.author.username}: ${message.content}`);
  if (!message.mentions.has(client.user)) return;
  if (message.author.bot) return;
  const content = message.content.toLowerCase();

  // Relance
  if (content.includes("relance")) {
    const posted = await getPostedUsers();
    const absents = CLIPPEURS.filter((u) => !posted.has(u.id));
    if (absents.length === 0) {
      await message.reply("✅ Tout le monde a posté son deadline check !");
      return;
    }
    const mentions = absents.map(formatMention).join(" ");
    await message.reply(`⚠️ **RELANCE — Deadline Check**\n\nVous avez jusqu'à minuit pour poster votre check !\n\n${mentions}`);
  }

  // Test strike — affiche les absents SANS ajouter de strike
  else if (content.includes("test strike")) {
    const posted = await getPostedUsers();
    const absents = CLIPPEURS.filter((u) => !posted.has(u.id));
    if (absents.length === 0) {
      await message.reply("✅ Tout le monde a posté son deadline check !");
      return;
    }
    const strikes = loadStrikes();
    const strikeList = absents.map((u) => `${formatMention(u)} — **${getActiveStrikes(strikes, u.username)} strike(s)**`).join("\n");
    await message.reply(`👀 **TEST — Absents aujourd'hui (aucun strike ajouté)**\n\n${strikeList}`);
  }

  // Strike — affiche les absents ET ajoute 1 strike
  else if (content.includes("strike")) {
    const posted = await getPostedUsers();
    const absents = CLIPPEURS.filter((u) => !posted.has(u.id));
    if (absents.length === 0) {
      await message.reply("✅ Aucun strike aujourd'hui, tout le monde a posté !");
      return;
    }
    const strikes = addStrikes(absents);
    const strikeList = absents.map((u) => `${formatMention(u)} — **${getActiveStrikes(strikes, u.username)} strike(s)**`).join("\n");
    await message.reply(`🚨 **STRIKE — Deadline Check manqué**\n\n${strikeList}`);
  }

  else if (content.includes("ids")) {
    const guild = message.guild;
    const members = await guild.members.fetch();
    const list = members
      .filter(m => !m.user.bot)
      .map(m => `${m.user.username} → ${m.user.id}`)
      .join("\n");
    await message.reply(`\`\`\`\n${list}\`\`\``);
  }

  else {
// -1 strike @mention
  else if (content.includes("-1 strike")) {
    const mentioned = message.mentions.users.filter(u => u.id !== client.user.id).first();
    if (!mentioned) {
      await message.reply("❌ Mentionne un clippeur ! Ex: **@bot -1 strike @pseudo**");
      return;
    }
    const clippeur = CLIPPEURS.find(c => c.id === mentioned.id);
    if (!clippeur) {
      await message.reply("❌ Ce membre n'est pas dans la liste des clippeurs !");
      return;
    }
    const strikes = loadStrikes();
    if (!strikes[clippeur.username] || strikes[clippeur.username].history.length === 0) {
      await message.reply(`ℹ️ ${formatMention(clippeur)} n'a aucun strike !`);
      return;
    }
    strikes[clippeur.username].history.pop();
    saveStrikes(strikes);
    await message.reply(`✅ **-1 strike** pour ${formatMention(clippeur)} — il lui reste **${getActiveStrikes(strikes, clippeur.username)} strike(s)**`);
  }

  // Reset strikes
  else if (content.includes("reset strike")) {
    const mentioned = message.mentions.users.filter(u => u.id !== client.user.id).first();
    const strikes = loadStrikes();

    if (mentioned) {
      const clippeur = CLIPPEURS.find(c => c.id === mentioned.id);
      if (!clippeur) {
        await message.reply("❌ Ce membre n'est pas dans la liste des clippeurs !");
        return;
      }
      strikes[clippeur.username] = { history: [] };
      saveStrikes(strikes);
      await message.reply(`✅ Strikes de ${formatMention(clippeur)} remis à **0** !`);
    } else {
      CLIPPEURS.forEach(c => { strikes[c.username] = { history: [] }; });
      saveStrikes(strikes);
      await message.reply("✅ Strikes de **tout le serveur** remis à **0** !");
    }
  }

  // Récap strikes
  else if (content.includes("recap")) {
    const strikes = loadStrikes();
    const list = CLIPPEURS
      .map(u => ({ u, count: getActiveStrikes(strikes, u.username) }))
      .sort((a, b) => b.count - a.count);

    const recap = list.map(({ u, count }) => `${formatMention(u)} — **${count} strike(s)**`).join("\n");
    await message.reply(`📊 **RÉCAP STRIKES (30 derniers jours)**\n\n${recap}`);
  }

  else {
    await message.reply("👋 Commandes disponibles :\n- **@bot relance** → relance les absents\n- **@bot test strike** → voir les absents sans striker\n- **@bot strike** → striker les absents (+1 strike)\n- **@bot -1 strike @pseudo** → enlever 1 strike\n- **@bot reset strike @pseudo** → reset un clippeur\n- **@bot reset strike** → reset tout le serveur\n- **@bot recap** → récap des strikes\n- **@bot ids** → liste tous les IDs");
  }  }
});

cron.schedule("0 23 * * *", async () => {
  console.log("⏰ Relance 23h lancée");
  const channel = await client.channels.fetch(CHANNEL_ID);
  const posted = await getPostedUsers();
  const absents = CLIPPEURS.filter((u) => !posted.has(u.id));
  if (absents.length === 0) {
    await channel.send("✅ Tout le monde a posté son deadline check !");
    return;
  }
  const mentions = absents.map(formatMention).join(" ");
  await channel.send(`⚠️ **RELANCE — Deadline Check**\n\nVous avez jusqu'à minuit pour poster votre check !\n\n${mentions}`);
}, { timezone: "Europe/Paris" });

cron.schedule("0 0 * * *", async () => {
  console.log("🚨 Attribution des strikes 00h");
  const channel = await client.channels.fetch(CHANNEL_ID);
  const posted = await getPostedUsers();
  const absents = CLIPPEURS.filter((u) => !posted.has(u.id));
  if (absents.length === 0) {
    await channel.send("✅ Aucun strike aujourd'hui, tout le monde a posté !");
    return;
  }
  const strikes = addStrikes(absents);
  const strikeList = absents.map((u) => `${formatMention(u)} — **${getActiveStrikes(strikes, u.username)} strike(s)**`).join("\n");
  await channel.send(`🚨 **STRIKE — Deadline Check manqué**\n\n${strikeList}`);
}, { timezone: "Europe/Paris" });

client.once("ready", () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
});

client.login(TOKEN);