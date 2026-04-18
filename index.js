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
  { username: "laurent005584", id: "1295112247563259987" },
  { username: "jeanbaptiste3494", id: "695582447441543228" },
  { username: "power_29476", id: null },
  { username: "gowizzus", id: "1106304129745305692" },
  { username: "caba4526", id: "1123510632604508170" },
  { username: "batultim3555", id: "999630067024011285" },
  { username: "maxime_1610", id: "499586906598932511" },
  { username: "zan0m", id: "769635925994635285" },
  { username: "ykama.", id: "1044715544026292224" },
  { username: "cheval1465", id: null },
  { username: "r_xphael", id: "1274481696561172623" },
  { username: "wwisppp", id: "1335715684860166256" },
  { username: "denisweb3", id: "771495349986394133" },
  { username: "_juxles_", id: "577118344667201536" },
  { username: "wisie_12", id: "488310265520324619" },
  { username: "jrc0510", id: "1196063285519319072" },
  { username: "zeikof_", id: "700796189716512808" },
  { username: ".quenntin", id: "281880856707072000" },
  { username: "lalouwww", id: "980148103355174992" },
  { username: "lilah_58361", id: null },
  { username: "gas2805", id: "855132579203514408" },
  { username: "harald08", id: "1089135713632649246" },
  { username: "azox08550", id: null },
  { username: "mahmood_7oo_86853", id: "1170372222368632833" },
  { username: "444pwn", id: "782963252078313473" },
  { username: "benn04", id: null },
  { username: "reyven1312_60357", id: "1390787812223352833" },
  { username: "xarty12345_69818", id: "1296085541661577269" },
  { username: "thebig_ggggg", id: null },
  { username: "leothecrack0374", id: "1424111262412968066" },
  { username: "yannael_bsn", id: "1112425970973028503" },
  { username: "stringerbell4", id: "1183913262295814186" },
  { username: "rexo7", id: "659143001221627927" },
  { username: "paquitigno_94546", id: null },
  { username: "yakage2226", id: "471335719445725194" },
  { username: "999window", id: "1027622118973775972" },
  { username: "noctyrix._45615", id: "1387348691530285126" },
  { username: "zac.cque", id: "1445749504090308614" },
  { username: "cactus14.", id: "1051840272113340447" },
  { username: "_mlle", id: "1026218057523286016" },
  { username: "eco_master.", id: "855515132616507423" },
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

async function getPostedUsers() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const messages = await channel.messages.fetch({ limit: 100 });
  const postedUsernames = new Set();
  messages.forEach((msg) => {
    const msgDate = new Date(msg.createdAt.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    if (msgDate >= startOfDay) {
      postedUsernames.add(msg.author.username.toLowerCase());
    }
  });
  return postedUsernames;
}

function formatMention(clippeur) {
  return clippeur.id ? `<@${clippeur.id}>` : `@${clippeur.username}`;
}

client.on(Events.MessageCreate, async (message) => {
  console.log(`Message reçu de ${message.author.username}: ${message.content}`);
  if (!message.mentions.has(client.user)) return;
  if (message.author.bot) return;
  const content = message.content.toLowerCase();

  if (content.includes("relance")) {
    const posted = await getPostedUsers();
    const absents = CLIPPEURS.filter((u) => !posted.has(u.username.toLowerCase()));
    if (absents.length === 0) {
      await message.reply("✅ Tout le monde a posté son deadline check !");
      return;
    }
    const mentions = absents.map(formatMention).join(" ");
    await message.reply(`⚠️ **RELANCE TEST — Deadline Check**\n\nVous avez jusqu'à minuit pour poster votre check !\n\n${mentions}`);
  }

  else if (content.includes("strike")) {
    const posted = await getPostedUsers();
    const absents = CLIPPEURS.filter((u) => !posted.has(u.username.toLowerCase()));
    if (absents.length === 0) {
      await message.reply("✅ Aucun strike aujourd'hui, tout le monde a posté !");
      return;
    }
    const strikes = loadStrikes();
    const strikeList = absents.map((u) => `${formatMention(u)} — **${strikes[u.username] ? strikes[u.username].total : 0} strike(s)**`).join("\n");
    await message.reply(`🚨 **STRIKE TEST — Deadline Check manqué**\n\n${strikeList}`);
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
    await message.reply("👋 Commandes disponibles :\n- **@bot relance** → teste la relance\n- **@bot strike** → teste les strikes\n- **@bot ids** → liste tous les IDs");
  }
});

cron.schedule("0 23 * * *", async () => {
  console.log("⏰ Relance 23h lancée");
  const channel = await client.channels.fetch(CHANNEL_ID);
  const posted = await getPostedUsers();
  const absents = CLIPPEURS.filter((u) => !posted.has(u.username.toLowerCase()));
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
  const absents = CLIPPEURS.filter((u) => !posted.has(u.username.toLowerCase()));
  if (absents.length === 0) {
    await channel.send("✅ Aucun strike aujourd'hui, tout le monde a posté !");
    return;
  }
  const strikes = loadStrikes();
  const today = new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
  absents.forEach((u) => {
    if (!strikes[u.username]) strikes[u.username] = { total: 0, history: [] };
    strikes[u.username].total += 1;
    strikes[u.username].history.push(today);
  });
  saveStrikes(strikes);
  const strikeList = absents.map((u) => `${formatMention(u)} — **${strikes[u.username].total} strike(s)**`).join("\n");
  await channel.send(`🚨 **STRIKE — Deadline Check manqué**\n\n${strikeList}`);
}, { timezone: "Europe/Paris" });

client.once("ready", () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
});

client.login(TOKEN);