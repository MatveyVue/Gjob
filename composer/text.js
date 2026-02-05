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
    console.log('🔄 Calling OpenRouter with prompt:', prompt.substring(0, 50) + '...');
    
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
        console.log('📤 Sending request to OpenRouter...');
        const response = await axios.post(OPENROUTER_API_URL, payload, {
            headers: headers,
            timeout: 10000 // Уменьшил таймаут до 10 секунд
        });

        console.log('✅ OpenRouter response status:', response.status);
        
        if (response.status === 200 && response.data.choices && response.data.choices.length > 0) {
            const reply = response.data.choices[0].message.content.trim();
            console.log('📝 OpenRouter reply length:', reply.length);
            return reply;
        } else {
            console.warn('⚠️ OpenRouter returned no choices');
            return "Извините, не удалось получить ответ. Попробуйте еще раз.";
        }
    } catch (error) {
        console.error('❌ OpenRouter API Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }
        return "Извините, произошла ошибка при обработке запроса. Пожалуйста, попробуйте еще раз.";
    }
}

// Обработчик команды /start
composer.start(async (ctx) => {
    console.log('🚀 /start command from user:', ctx.from.id, ctx.from.username);
    
    const photoUrl = 'https://github.com/MatveyVue/Gjob/blob/main/Gjob.png?raw=true';
    console.log('🖼️ Using photo URL:', photoUrl);

    try {
        console.log('📤 Sending photo...');
        await ctx.replyWithPhoto(photoUrl, {
            caption: `🤖 *Hi! I'm Gjob, your AI assistant*\n\n` +
                    `I'm here to help you with any questions or tasks.\n\n` +
                    `Just send me a message and I'll assist you!`,
            parse_mode: 'Markdown'
        });
        console.log('✅ Photo sent successfully');
    } catch (error) {
        console.error('❌ Error sending photo:', error.message);
        // Fallback - отправляем текстовое сообщение если фото не загружается
        await ctx.reply(
            `🤖 *Hi! I'm Gjob, your AI assistant*\n\n` +
            `I'm here to help you with any questions or tasks.\n\n` +
            `Just send me a message and I'll assist you!`,
            { parse_mode: 'Markdown' }
        );
        console.log('✅ Fallback text message sent');
    }
});

// Обработчик текстовых сообщений
composer.on('text', async (ctx) => {
    const userMessage = ctx.message.text;
    console.log('📝 Text message from', ctx.from.id, ':', userMessage);
    
    // Игнорируем команды
    if (userMessage.startsWith('/')) {
        console.log('⏩ Skipping command');
        return;
    }
    
    // Показываем статус "печатает"
    try {
        await ctx.sendChatAction('typing');
        console.log('⌛ Typing action sent');
    } catch (error) {
        console.error('❌ Error sending typing action:', error.message);
    }
    
    try {
        // Получаем ответ от OpenRouter
        console.log('🔄 Processing with OpenRouter...');
        const response = await callOpenRouter(userMessage);
        
        // Отправляем ответ
        console.log('📤 Sending reply...');
        await ctx.reply(response, {
            parse_mode: 'Markdown'
        });
        console.log('✅ Reply sent successfully');
    } catch (error) {
        console.error('❌ Error processing message:', error.message);
        try {
            await ctx.reply("Извините, произошла ошибка. Пожалуйста, попробуйте еще раз.");
        } catch (sendError) {
            console.error('❌ Error sending error message:', sendError.message);
        }
    }
});

// Обработчик ошибок
composer.catch((err, ctx) => {
    console.error(`❌ Error in composer for ${ctx.updateType}:`, err.message);
    console.error('Full error:', err);
});

module.exports = composer;
