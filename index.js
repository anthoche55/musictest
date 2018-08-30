const Discord = require('discord.js');
const config = require('./config.json');
const cmds = require('./commands.js');
const music = require('./music.js');
const tool = require('./tool.js');
const prompt = require('prompt');
const colors = require('colors');
prompt.message = '';
prompt.delimiter = '';

const bot = new Discord.Client();

bot.on('ready', () => {
    console.log(`${bot.user.username} est demarrer`);
    console.log(`Le bot est sur  ${bot.guilds.size} serveurs.`);
    bot.user.setActivity(config.prefix + 'help');
// Commandes internes du bot.
});

bot.on('message', msg => {
    if (msg.author.bot || msg.channel.type != 'text')
        return; // Ne répondez pas aux messages de bots ou de messages qui ne proviennent pas de serveur.

    if (!msg.content.startsWith(config.prefix))
        return; // Pas une commande.

    let cmd = msg.content.split(/\s+/)[0].slice(config.prefix.length).toLowerCase();
    getCmdFunction(cmd)(msg);
});

bot.on('error', (e) => console.error(e));
bot.on('warn', (e) => console.warn(e));
//bot.on('debug', (e) => console.info(e));

bot.login(config.token);

function getCmdFunction(cmd) {
    const COMMANDS = {
	    'ban': cmds.ban,
        'choose': cmds.choose,
        'help': cmds.help,
        'debug': cmds.debug,
        'kick': cmds.kick,
        'prune': cmds.prune,
        'music': music.processCommand,
    }
    return COMMANDS[cmd] ? COMMANDS[cmd] : () => {};
}




