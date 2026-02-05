const { Telegraf } = require('telegraf');
const bot = new Telegraf('8291475798:AAHMVeNhqwhQKju8dZnYUP3x7LIAu-kldxs');

// Подключаем обработчики
bot.use(require('./composer/text.js'));

// Экспортируем функцию для Vercel
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } else {
    res.send('Gjob Bot is running!');
  }
};