const { Composer } = require('telegraf');
const axios = require('axios');

const composer = new Composer();

// Конфигурация API
const API_KEY = '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';
const API_URL = 'https://openrouter.ai/api/v1/completions';

async function callAI(prompt) {
    const headers = {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
    };

    const payload = {
        'model': 'openai/gpt-oss-120b',
        'messages': [
            {
                'role': 'user',
                'content': prompt
            }
        ],
        'max_tokens': 300
    };

    try {
        const response = await axios.post(API_URL, payload, {
            headers: headers,
            timeout: 10000
        });

        if (response.data.choices && response.data.choices.length > 0) {
            return response.data.choices[0].message.content.trim();
        } else {
            return "Sorry, I couldn't get a response.";
        }
    } catch (error) {
        console.error('API Error:', error.message);
        return "Sorry, there was an error.";
    }
}

// Обработчик команды /start
composer.start(async (ctx) => {
    try {
        await ctx.replyWithPhoto(
            'https://github.com/MatveyVue/Gjob/blob/main/Gjob.png?raw=true',
            {
                caption: '🤖 Hi! I\'m Gjob!\n\nSend me a message!',
                parse_mode: 'Markdown'
            }
        );
    } catch (error) {
        await ctx.reply('🤖 Hi! I\'m Gjob!\n\nSend me a message!');
    }
});

// Обработчик текстовых сообщений
composer.on('text', async (ctx) => {
    const text = ctx.message.text;
    
    if (text.startsWith('/')) return;
    
    await ctx.sendChatAction('typing');
    
    try {
        const response = await callAI(text);
        await ctx.reply(response);
    } catch (error) {
        await ctx.reply('Sorry, error occurred.');
    }
});

module.exports = composer;
