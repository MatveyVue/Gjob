const { Composer } = require('telegraf');
const axios = require('axios');

const composer = new Composer();

console.log('✅ Composer loaded successfully');

// Конфигурация OpenRouter
const OPENROUTER_API_KEY = 'sk-or-v1-e6dd17da3badafdedf9d10e6ef639fbb06a674812f8b964ed93c8de01bdbb30';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = "openai/gpt-3.5-turbo";

// Функция для вызова OpenRouter API
async function callOpenRouter(prompt) {
    console.log('🔄 Calling OpenRouter');
    
    const headers = {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://gjob.vercel.app',
        'X-Title': 'Gjob Telegram Bot'
    };

    const payload = {
        'model': MODEL,
        'messages': [
            {
                'role': 'system',
                'content': 'Ты очень умный и полезный помощник в Telegram-боте. Отвечай кратко и по делу. Твое имя Gjob. Отвечай на русском языке если вопрос на русском, на английском если вопрос на английском.'
            },
            {
                'role': 'user',
                'content': prompt
            }
        ],
        'max_tokens': 500,
        'temperature': 0.7
    };

    try {
        const response = await axios.post(OPENROUTER_API_URL, payload, {
            headers: headers,
            timeout: 10000
        });

        if (response.status === 200 && response.data.choices && response.data.choices.length > 0) {
            return response.data.choices[0].message.content.trim();
        } else {
            return "Извините, не удалось получить ответ.";
        }
    } catch (error) {
        console.error('OpenRouter API Error:', error.message);
        return "Извините, произошла ошибка.";
    }
}

// Обработчик команды /start
composer.start(async (ctx) => {
    console.log('/start command received');
    
    const photoUrl = 'https://github.com/MatveyVue/Gjob/blob/main/Gjob.png?raw=true';

    try {
        await ctx.replyWithPhoto(photoUrl, {
            caption: `🤖 *Hi! I'm Gjob, your AI assistant*\n\nI'm here to help you!`,
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('Photo error:', error);
        await ctx.reply(
            `🤖 *Hi! I'm Gjob, your AI assistant*\n\nI'm here to help you!`,
            { parse_mode: 'Markdown' }
        );
    }
});

// Обработчик текстовых сообщений
composer.on('text', async (ctx) => {
    const userMessage = ctx.message.text;
    console.log('Text message:', userMessage);
    
    if (userMessage.startsWith('/')) {
        return;
    }
    
    try {
        await ctx.sendChatAction('typing');
        const response = await callOpenRouter(userMessage);
        await ctx.reply(response, {
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('Error processing message:', error);
        await ctx.reply("Извините, произошла ошибка.");
    }
});

// Убрал composer.catch - это вызывает ошибку
// composer.catch((err, ctx) => {
//     console.error(`Error in composer:`, err);
// });

module.exports = composer;
