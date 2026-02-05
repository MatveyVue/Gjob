const { Composer } = require('telegraf');
const axios = require('axios');

const composer = new Composer();

console.log('✅ Composer loaded - Using xAI API');

// xAI API ключ
const XAI_API_KEY = 'xai-P3l8p7HmHo800nEhxyGeJ22PS3QANiPqrGTwgaKgw8Qxodwut7GBG0UfMW2IcTWt8rOzpnblbFZtJCSu';
const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';

async function callXAI(prompt) {
    console.log('🔄 Calling xAI API with prompt:', prompt.substring(0, 50) + '...');
    
    const headers = {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json'
    };

    const payload = {
        messages: [
            {
                role: 'system',
                content: 'Ты очень умный и полезный помощник в Telegram-боте и тебя зовут Gjob. Всегда отвечай на вопрос о том как тебя зовут говори Gjob. Отвечай кратко и по делу.'
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        model: 'grok-4-latest', // или 'grok-4.1-fast'
        stream: false,
        temperature: 0.7,
        max_tokens: 500
    };

    try {
        console.log('📤 Sending request to xAI...');
        const response = await axios.post(XAI_API_URL, payload, {
            headers: headers,
            timeout: 30000
        });

        console.log('✅ xAI response status:', response.status);
        
        if (response.data && response.data.choices && response.data.choices.length > 0) {
            const reply = response.data.choices[0].message.content.trim();
            console.log('📝 Response received, length:', reply.length);
            return reply;
        } else {
            console.warn('No choices in response:', response.data);
            return "Извините, не удалось получить ответ от AI.";
        }
    } catch (error) {
        console.error('❌ xAI API Error:');
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Status text:', error.response.statusText);
            console.error('Error data:', JSON.stringify(error.response.data, null, 2));
            
            if (error.response.status === 401) {
                return "❌ Ошибка 401: Неверный API ключ xAI. Проверьте ключ.";
            } else if (error.response.status === 429) {
                return "⚠️ Слишком много запросов к xAI. Попробуйте позже.";
            }
        } else if (error.request) {
            console.error('No response received:', error.message);
            return "⚠️ Нет ответа от xAI сервера. Проверьте подключение.";
        } else {
            console.error('Request error:', error.message);
        }
        
        return "⚠️ Временные проблемы с xAI сервисом. Попробуйте еще раз.";
    }
}

// Обработчик команды /start
composer.start(async (ctx) => {
    console.log('/start command from:', ctx.from.id);
    
    try {
        await ctx.replyWithPhoto(
            'https://github.com/MatveyVue/Gjob/blob/main/Gjob.png?raw=true',
            {
                caption: `🤖 *Hi! I\'m Gjob!*\n\n` +
                        `Powered by xAI Grok 🤖\n\n` +
                        `Just send me a message and I\'ll help you!`,
                parse_mode: 'Markdown'
            }
        );
    } catch (error) {
        console.error('Photo error:', error.message);
        await ctx.reply(
            `🤖 *Hi! I\'m Gjob!*\n\nPowered by xAI Grok 🤖\n\nSend me a message!`,
            { parse_mode: 'Markdown' }
        );
    }
});

// Обработчик текстовых сообщений
composer.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    console.log('Text message from', ctx.from.id, ':', text);
    
    // Игнорируем команды
    if (text.startsWith('/')) return;
    
    // Тестовые команды
    if (text.toLowerCase() === 'ping') {
        return ctx.reply('🏓 Pong! xAI bot is working!');
    }
    
    if (text.toLowerCase() === 'status') {
        return ctx.reply('✅ Status: xAI bot is active and ready!');
    }
    
    if (text.toLowerCase() === 'test') {
        return ctx.reply('🧪 Test successful! xAI API connected.');
    }
    
    await ctx.sendChatAction('typing');
    
    try {
        const response = await callXAI(text);
        await ctx.reply(response, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Main error:', error);
        await ctx.reply('❌ Sorry, I encountered an error. Try again.');
    }
});

module.exports = composer;
