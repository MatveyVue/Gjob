// Минимальный index.js
const { Telegraf } = require('telegraf');
const bot = new Telegraf('8291475798:AAHMVeNhqwhQKju8dZnYUP3x7LIAu-kldxs');

bot.start((ctx) => ctx.reply('Hello from Vercel!'));
bot.on('text', (ctx) => ctx.reply('You said: ' + ctx.message.text));

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    await bot.handleUpdate(req.body);
    res.end();
  } else {
    res.send('Bot is running!');
  }
};
