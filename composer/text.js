const { Composer } = require('telegraf');
const axios = require('axios');

const composer = new Composer();

// Конфигурация OpenRouter
const OPENROUTER_API_KEY = 'sk-or-v1-e6dd17da3badafdedf9d10e6ef639fbb06a674812f8b964ed93c8de01bdbb30';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = "openai/gpt-3.5-turbo";

// Функция для вызова OpenRouter API
async function callOpenRouter(prompt) {
    const headers = {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://gjob-ai.vercel.app',
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
            timeout: 30000
        });

        if (response.status === 200 && response.data.choices && response.data.choices.length > 0) {
            return response.data.choices[0].message.content.trim();
        } else {
            return "Извините, не удалось получить ответ. Попробуйте еще раз.";
        }
    } catch (error) {
        console.error('OpenRouter API Error:', error.response?.data || error.message);
        return "Извините, произошла ошибка при обработке запроса. Пожалуйста, попробуйте еще раз.";
    }
}

// Обработчик команды /start
composer.start(async (ctx) => {
    const photoUrl = 'https://github.com/MatveyVue/Gjob/blob/main/Gjob.png?raw=true';

    return ctx.replyWithPhoto(photoUrl, {
        caption: `🤖 *Hi! I'm Gjob, your AI assistant*\n\n` +
                `I'm here to help you with any questions or tasks.\n\n` +
                `Just send me a message and I'll assist you!`,
        parse_mode: 'Markdown'
    });
});

// Обработчик текстовых сообщений
composer.on('text', async (ctx) => {
    const userMessage = ctx.message.text;
    
    // Игнорируем команды
    if (userMessage.startsWith('/')) {
        return;
    }
    
    // Показываем статус "печатает"
    await ctx.sendChatAction('typing');
    
    try {
        // Получаем ответ от OpenRouter
        const response = await callOpenRouter(userMessage);
        
        // Отправляем ответ
        await ctx.reply(response, {
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('Error processing message:', error);
        await ctx.reply("Извините, произошла ошибка. Пожалуйста, попробуйте еще раз.");
    }
});

// Обработчик ошибок
composer.catch((err, ctx) => {
    console.error(`Error in composer for ${ctx.updateType}:`, err);
});

module.exports = composer;