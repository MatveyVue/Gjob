const { Telegraf } = require('telegraf');
const express = require('express');

const app = express();

const BOT_TOKEN = '8291475798:AAHMVeNhqwhQKju8dZnYUP3x7LIAu-kldxs';
const bot = new Telegraf(BOT_TOKEN);

// Middleware
app.use(express.json());

// Логируем все запросы для отладки
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Подключаем обработчики
bot.use(require('./composer/text.js'));

// Главная страница - ТОЛЬКО статус, не устанавливаем вебхук
app.get('/', (req, res) => {
  console.log('GET / - Главная страница');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Gjob Bot Status</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 40px;
          text-align: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          min-height: 100vh;
        }
        .container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 40px;
          margin: 0 auto;
          max-width: 600px;
        }
        h1 { font-size: 2.5rem; margin-bottom: 20px; }
        .status {
          background: #4CAF50;
          color: white;
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
        }
        .btn {
          display: inline-block;
          background: white;
          color: #667eea;
          padding: 12px 24px;
          border-radius: 50px;
          text-decoration: none;
          font-weight: bold;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 Gjob AI Bot</h1>
        <div class="status">
          ✅ <strong>Server is running!</strong><br>
          Bot status: Ready
        </div>
        <p>To set webhook manually:</p>
        <a href="https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=https://gjob-ai.vercel.app/bot${BOT_TOKEN}" 
           target="_blank" class="btn">
          ⚙️ Set Webhook
        </a>
      </div>
    </body>
    </html>
  `);
});

// Отдельный endpoint для установки вебхука
app.get('/setwebhook', async (req, res) => {
  try {
    const webhookUrl = `https://gjob.vercel.app/bot${BOT_TOKEN}`;
    const result = await bot.telegram.setWebhook(webhookUrl);
    console.log('Webhook установлен:', result);
    res.json({ 
      success: true, 
      webhookUrl: webhookUrl,
      result: result 
    });
  } catch (error) {
    console.error('Ошибка установки webhook:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Endpoint для проверки вебхука
app.get('/getwebhookinfo', async (req, res) => {
  try {
    const info = await bot.telegram.getWebhookInfo();
    console.log('Webhook info:', info);
    res.json(info);
  } catch (error) {
    console.error('Ошибка получения webhook info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Вебхук endpoint
app.post(`/bot${BOT_TOKEN}`, async (req, res) => {
  console.log('POST /bot' + BOT_TOKEN, 'Body:', JSON.stringify(req.body).substring(0, 200));
  
  try {
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling update:', error);
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

// Экспортируем для Vercel
module.exports = app;
