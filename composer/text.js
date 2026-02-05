const { Composer } = require('telegraf');
const axios = require('axios');

const composer = new Composer();

console.log('🤖 Gjob bot composer loaded');

// Конфигурация API
const API_KEY = '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';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function callAI(prompt) {
    console.log('🔄 Calling API with prompt:', prompt.substring(0, 50) + '...');
    
    const headers = {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://gjob.vercel.app',
        'X-Title': 'Gjob Telegram Bot'
    };

    const payload = {
        'model': 'openai/gpt-3.5-turbo',
        'messages': [
            {
                'role': 'system',
                'content': 'Ты полезный помощник Gjob. Отвечай кратко.'
            },
            {
                'role': 'user',
                'content': prompt
            }
        ],
        'max_tokens': 300,
        'temperature': 0.7
    };

    try {
        console.log('📤 Sending POST request to:', API_URL);
        const response = await axios.post(API_URL, payload, {
            headers: headers,
            timeout: 15000
        });

        console.log('✅ API Response status:', response.status);
        
        if (response.data && response.data.choices && response.data.choices.length > 0) {
            const reply = response.data.choices[0].message.content.trim();
            console.log('📝 Response length:', reply.length);
            return reply;
        } else {
            console.warn('⚠️ No choices in response:', response.data);
            return "Извините, не удалось получить ответ.";
        }
    } catch (error) {
        console.error('❌ API Error details:');
        console.error('Error message:', error.message);
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            
            if (error.response.status === 401) {
                return "❌ Ошибка 401: Неверный API ключ.";
            } else if (error.response.status === 429) {
                return "⚠️ Слишком много запросов. Подождите.";
            }
        }
        
        return "⚠️ Временные проблемы с сервисом.";
    }
}

// Обработчик команды /start
composer.start(async (ctx) => {
    console.log('/start command from:', ctx.from.id);
    
    try {
        await ctx.replyWithPhoto(
            'https://github.com/MatveyVue/Gjob/blob/main/Gjob.png?raw=true',
            {
                caption: `🤖 *Hi! I'm Gjob!*\n\n` +
                        `Powered by AI 🤖\n\n` +
                        `Send me any message!`,
                parse_mode: 'Markdown'
            }
        );
        console.log('✅ Start command processed');
    } catch (error) {
        console.error('Photo error:', error.message);
        await ctx.reply(
            `🤖 *Hi! I'm Gjob!*\n\nSend me a message!`,
            { parse_mode: 'Markdown' }
        );
    }
});

// Обработчик текстовых сообщений
composer.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    console.log('📩 Message from', ctx.from.id, ':', text);
    
    if (text.startsWith('/')) return;
    
    // Быстрые команды для теста
    if (text.toLowerCase() === 'ping') {
        return ctx.reply('🏓 Pong! Bot is alive!');
    }
    
    if (text.toLowerCase() === 'test') {
        return ctx.reply('✅ Test successful! Bot is working.');
    }
    
    await ctx.sendChatAction('typing');
    
    try {
        const response = await callAI(text);
        await ctx.reply(response);
    } catch (error) {
        console.error('Main error:', error);
        await ctx.reply('❌ Sorry, I encountered an error.');
    }
});

module.exports = composer;
