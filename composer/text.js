const { Composer } = require('telegraf');
const axios = require('axios');

const composer = new Composer();

console.log('🤖 Gjob bot loaded');

const API_KEY = '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';

async function callAI(prompt) {
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'openai/gpt-3.5-turbo',
                messages: [
                    {
                        role: 'user',
                        content: 'Ты очень умный и полезный помощник в Telegram-боте. Отвечай кратко и по делу. Твое имя Gjob.'
                    }
                ],
                max_tokens: 300
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        if (response.data.choices?.[0]?.message?.content) {
            return response.data.choices[0].message.content.trim();
        }
        return "I couldn't generate a response.";
        
    } catch (error) {
        console.log('API error:', error.message);
        return "I'm having trouble connecting right now.";
    }
}

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

composer.on('text', async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return;
    
    // Quick responses for stability
    const lowerText = text.toLowerCase();
    if (lowerText === 'ping') return ctx.reply('🏓 Pong!');
    if (lowerText === 'test') return ctx.reply('✅ Working!');
    if (lowerText === 'hello') return ctx.reply('👋 Hello!');
    if (lowerText === 'hi') return ctx.reply('👋 Hi!');
    
    await ctx.sendChatAction('typing');
    
    try {
        const response = await callAI(text);
        await ctx.reply(response);
    } catch (error) {
        await ctx.reply('Please try again.');
    }
});

module.exports = composer;
