import { Client, GatewayIntentBits, Partials, SlashCommandBuilder, Routes } from 'discord.js';
import { REST } from 'discord.js';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// -------------------------------
// DATABASE SETUP
// -------------------------------
const db = await open({ filename: 'recrutamento.db', driver: sqlite3.Database });
await db.exec(`CREATE TABLE IF NOT EXISTS recrutamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recrutador TEXT,
  usuario TEXT,
  ponte REAL,
  nocao REAL,
  pvp REAL,
  nota_final REAL
)`);

// -------------------------------
// BOT SETUP
// -------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// -------------------------------
// SLASH COMMAND /rec
// -------------------------------
const commands = [
  new SlashCommandBuilder()
    .setName('rec')
    .setDescription('Registrar avaliação de um jogador.')
    .addStringOption(opt => opt.setName('usuario').setDescription('Nome do usuário').setRequired(true))
    .addNumberOption(opt => opt.setName('ponte').setDescription('Ponte').setRequired(true))
    .addNumberOption(opt => opt.setName('nocao').setDescription('Noção de jogo').setRequired(true))
    .addNumberOption(opt => opt.setName('pvp').setDescription('PVP').setRequired(true))
];

const rest = new REST({ version: '10' }).setToken(TOKEN);
await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

// -------------------------------
// READY
// -------------------------------
client.once('ready', () => {
  console.log(`Bot online como ${client.user.tag}`);
});

// -------------------------------
// COMANDO /rec
// -------------------------------
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'rec') return;

  const usuario = interaction.options.getString('usuario');
  const ponte = interaction.options.getNumber('ponte');
  const nocao = interaction.options.getNumber('nocao');
  const pvp = interaction.options.getNumber('pvp');

  const soma = ponte + nocao + pvp;
  if (soma < 20) {
    await interaction.reply({ content: `❌ A nota final **${soma}** é menor que 20. Recrutamento recusado.`, ephemeral: true });
    return;
  }

  await db.run(`INSERT INTO recrutamentos (recrutador, usuario, ponte, nocao, pvp, nota_final) VALUES (?, ?, ?, ?, ?, ?)`, [
    interaction.user.id,
    usuario,
    ponte,
    nocao,
    pvp,
    soma
  ]);

  await interaction.reply(`**RECRUTADOR:** <@${interaction.user.id}>
**USUARIO:** ${usuario}
**PONTE:** ${ponte}
**NOÇÃO DE JOGO:** ${nocao}
**PVP:** ${pvp}
**NOTA FINAL:** ${soma}`);
});

// -------------------------------
// MENSAGEM QUANDO ALGUÉM ENTRA
// -------------------------------
const canaisAviso = ["1439769189283008562", "1439769238469607594"]; // coloque IDs corretos

client.on('guildMemberAdd', async member => {
  for (const canal of canaisAviso) {
    const ch = member.guild.channels.cache.get(canal);
    if (ch) {
      ch.send(`Por favor, recrutador responsável pela pessoa que entrou: <@${member.id}>
Caso ela ingresse em algum dos clans registre-a neste canal e coloque nos clãs!`);
    }
  }
});

// -------------------------------
// CAPTURAR MENSAGENS COM "USUARIO"
// -------------------------------
client.on('messageCreate', async msg => {
  if (msg.author.bot) return;
  if (!msg.content.includes('USUARIO')) return;

  await db.run(
    `INSERT INTO recrutamentos (recrutador, usuario, ponte, nocao, pvp, nota_final) VALUES (?, ?, ?, ?, ?, ?)`,
    [ msg.author.id, null, null, null, null, msg.content ]
  );
});

client.login(TOKEN);