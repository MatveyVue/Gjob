const { Telegraf } = require('telegraf');
const express = require('express');

const app = express();

const BOT_TOKEN = '8291475798:AAHMVeNhqwhQKju8dZnYUP3x7LIAu-kldxs';
const bot = new Telegraf(BOT_TOKEN);

console.log('🤖 Bot initializing...');

// Middleware
app.use(express.json());

// Логирование всех запросов
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  
  if (req.method === 'POST' && req.body) {
    console.log('📦 Request body:', JSON.stringify(req.body).substring(0, 200) + '...');
  }
  
  next();
});

// Подключаем обработчики
try {
  bot.use(require('./composer/text.js'));
  console.log('✅ Composer loaded successfully');
} catch (error) {
  console.error('❌ Failed to load composer:', error.message);
  process.exit(1);
}

// Главная страница
app.get('/', (req, res) => {
  console.log('🏠 Home page accessed');
  res.send('Gjob Bot is running on Vercel');
});

// Проверка вебхука
app.get('/getwebhookinfo', async (req, res) => {
  try {
    console.log('🔍 Getting webhook info...');
    const info = await bot.telegram.getWebhookInfo();
    console.log('📊 Webhook info:', info);
    res.json(info);
  } catch (error) {
    console.error('❌ Error getting webhook info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Вебхук endpoint
app.post(`/bot${BOT_TOKEN}`, async (req, res) => {
  console.log('📨 Webhook request received');
  
  try {
    console.log('🔄 Processing update...');
    await bot.handleUpdate(req.body);
    console.log('✅ Update processed successfully');
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error handling update:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).send('Error');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'gjob-bot'
  });
});

console.log('🚀 Bot ready to receive updates');
console.log(`🌐 Webhook URL: https://gjob.vercel.app/bot${BOT_TOKEN}`);

// Экспортируем для Vercel
module.exports = app;
