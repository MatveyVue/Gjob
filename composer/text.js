const { Composer } = require('telegraf');
const axios = require('axios');

const composer = new Composer();

console.log('✅ Composer loaded');

const OPENROUTER_API_KEY = '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = "openai/gpt-3.5-turbo";

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
                'content': 'Ты полезный помощник Gjob. Отвечай кратко и по делу.'
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
        const response = await axios.post(OPENROUTER_API_URL, payload, {
            headers: headers,
            timeout: 15000
        });

        console.log('✅ OpenRouter response:', response.status);
        
        if (response.data.choices && response.data.choices.length > 0) {
            return response.data.choices[0].message.content.trim();
        } else {
            console.warn('No choices in response');
            return "Извините, не удалось получить ответ.";
        }
    } catch (error) {
        console.error('❌ OpenRouter Error:', error.response?.status, error.message);
        
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
        
        if (error.response?.status === 401) {
            return "❌ Ошибка авторизации API. Пожалуйста, проверьте API ключ.";
        } else if (error.response?.status === 429) {
            return "⚠️ Слишком много запросов. Попробуйте позже.";
        } else {
            return "⚠️ Временные проблемы с сервисом. Попробуйте еще раз.";
        }
    }
}

// Обработчик команды /start
composer.start(async (ctx) => {
    console.log('/start from:', ctx.from.username || ctx.from.id);
    
    try {
        await ctx.replyWithPhoto(
            'https://github.com/MatveyVue/Gjob/blob/main/Gjob.png?raw=true',
            {
                caption: `🤖 *Hi! I'm Gjob, your AI assistant!*\n\nI can help you with questions, ideas, tasks, and more!\n\nJust send me a message!`,
                parse_mode: 'Markdown'
            }
        );
    } catch (error) {
        console.error('Photo error:', error.message);
        await ctx.reply(
            '🤖 *Hi! I\'m Gjob, your AI assistant!*\n\nHow can I help you today?',
            { parse_mode: 'Markdown' }
        );
    }
});

// Обработчик текстовых сообщений
composer.on('text', async (ctx) => {
    const text = ctx.message.text;
    console.log('Text from', ctx.from.id, ':', text);
    
    if (text.startsWith('/')) return;
    
    try {
        await ctx.sendChatAction('typing');
        
        const response = await callOpenRouter(text);
        await ctx.reply(response);
        
    } catch (error) {
        console.error('Processing error:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте еще раз.');
    }
});

module.exports = composer;
