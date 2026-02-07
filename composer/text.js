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
                        role: 'system',
                        content: 'Твое имя Gjob. Ты AI помощник в Telegram боте. Отвечай кратко. Всегда говори что тебя зовут Gjob когда спрашивают о твоем имени.'
                    },
                    {
                        role: 'user',
                        content: prompt
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
    
    // Проверяем, является ли чат приватным (личные сообщения)
    const isPrivateChat = ctx.chat.type === 'private';
    
    // Если это не приватный чат и бота не отметили - игнорируем сообщение
    if (!isPrivateChat) {
        // Проверяем, упомянут ли бот в сообщении
        const botUsername = ctx.botInfo?.username || 'Gjob_bot';
        const mentioned = text.includes(`@${botUsername}`);
        
        // Если бот не упомянут - игнорируем сообщение
        if (!mentioned) {
            return;
        }
        
        // Удаляем упоминание из текста для обработки
        const cleanText = text.replace(`@${botUsername}`, '').trim();
        if (!cleanText) {
            return ctx.reply('🤖 Да, это я! Gjob ваш помощник!');
        }
    }
    
    // Для приватных чатов или если бот упомянут - обрабатываем сообщение
    const processedText = isPrivateChat ? text : text.replace(`@${ctx.botInfo?.username || 'Gjob_bot'}`, '').trim();
    const lowerText = processedText.toLowerCase();
    
    // Ответы на вопросы об имени
    if (lowerText.includes('как тебя зовут') || lowerText.includes('твое имя') || 
        lowerText.includes('your name') || lowerText.includes('who are you')) {
        return ctx.reply('🤖 Меня зовут Gjob!');
    }
    
    if (lowerText === 'gjob' || lowerText === 'джоб') {
        return ctx.reply('🤖 Да, это я! Gjob ваш помощник!');
    }
    
    if (lowerText === 'ping') return ctx.reply('🏓 Pong!');
    if (lowerText === 'test') return ctx.reply('✅ Working!');
    if (lowerText === 'hello') return ctx.reply('👋 Hello! I\'m Gjob!');
    if (lowerText === 'hi') return ctx.reply('👋 Hi! I\'m Gjob!');
    
    await ctx.sendChatAction('typing');
    
    try {
        const response = await callAI(processedText);
        await ctx.reply(response);
    } catch (error) {
        await ctx.reply('Please try again.');
    }
});

// Обработка упоминаний в ответах на сообщения (реплаях)
composer.on('reply_to_message', async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return;
    
    // Проверяем, является ли ответ на сообщение бота
    const repliedToBot = ctx.message.reply_to_message?.from?.id === ctx.botInfo.id;
    
    // Если это ответ на сообщение бота в группе - обрабатываем
    if (repliedToBot) {
        const lowerText = text.toLowerCase();
        
        // Ответы на вопросы об имени
        if (lowerText.includes('как тебя зовут') || lowerText.includes('твое имя') || 
            lowerText.includes('your name') || lowerText.includes('who are you')) {
            return ctx.reply('🤖 Меня зовут Gjob!');
        }
        
        if (lowerText === 'gjob' || lowerText === 'джоб') {
            return ctx.reply('🤖 Да, это я! Gjob ваш помощник!');
        }
        
        if (lowerText === 'ping') return ctx.reply('🏓 Pong!');
        if (lowerText === 'test') return ctx.reply('✅ Working!');
        if (lowerText === 'hello') return ctx.reply('👋 Hello! I\'m Gjob!');
        if (lowerText === 'hi') return ctx.reply('👋 Hi! I\'m Gjob!');
        
        await ctx.sendChatAction('typing');
        
        try {
            const response = await callAI(text);
            await ctx.reply(response);
        } catch (error) {
            await ctx.reply('Please try again.');
        }
    }
});

module.exports = composer;