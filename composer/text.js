const { Composer } = require('telegraf');
const axios = require('axios');

const composer = new Composer();

console.log('🤖 Gjob bot composer loaded');

// Пробуем разные API ключи и модели
const API_CONFIGS = [
    {
        name: 'OpenRouter DeepSeek',
        apiKey: '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',
        apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
        model: 'deepseek/deepseek-chat-v3-0324'
    },
    // Добавьте другие конфигурации если есть
];

// Функция для вызова AI API
async function callAI(prompt) {
    console.log('Processing prompt:', prompt.substring(0, 50) + '...');
    
    for (const config of API_CONFIGS) {
        console.log(`Trying ${config.name}...`);
        
        const headers = {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://gjob.vercel.app',
            'X-Title': 'Gjob Bot'
        };

        const payload = {
            'model': config.model,
            'messages': [
                {
                    'role': 'system',
                    'content': 'Ты Gjob, полезный AI помощник. Отвечай кратко.'
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
            const response = await axios.post(config.apiUrl, payload, {
                headers: headers,
                timeout: 15000
            });

            console.log(`${config.name} response:`, response.status);
            
            if (response.data.choices && response.data.choices.length > 0) {
                return response.data.choices[0].message.content.trim();
            }
        } catch (error) {
            console.error(`${config.name} failed:`, error.response?.status || error.message);
            // Пробуем следующую конфигурацию
            continue;
        }
    }
    
    // Если все API не работают, используем fallback
    return getFallbackResponse(prompt);
}

// Fallback ответы если API не работают
function getFallbackResponse(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    const responses = {
        'привет': '👋 Привет! Я Gjob, ваш AI помощник!',
        'hello': '👋 Hello! I\'m Gjob, your AI assistant!',
        'hi': '👋 Hi there!',
        'как дела': '🤖 У меня все отлично! А у вас?',
        'how are you': '🤖 I\'m doing great! How about you?',
        'бот': '🤖 Да, я здесь! Чем могу помочь?',
        'bot': '🤖 Yes, I\'m here! How can I help?',
        'помощь': 'ℹ️ Я могу отвечать на вопросы, помогать с задачами. Просто спросите!',
        'help': 'ℹ️ I can answer questions, help with tasks. Just ask me!',
        'тест': '✅ Бот работает! Отправьте любой вопрос.',
        'test': '✅ Bot is working! Send me any question.',
        'ping': '🏓 Pong! Bot is alive!',
        'что ты умеешь': '🚀 Я могу: отвечать на вопросы, давать советы, помогать с идеями!',
        'what can you do': '🚀 I can: answer questions, give advice, help with ideas!'
    };
    
    // Ищем точное совпадение
    if (responses[lowerPrompt]) {
        return responses[lowerPrompt];
    }
    
    // Ищем частичное совпадение
    for (const [key, response] of Object.entries(responses)) {
        if (lowerPrompt.includes(key)) {
            return response;
        }
    }
    
    // Общий ответ
    return '🤖 Я получил ваше сообщение! К сожалению, AI сервис временно недоступен. Попробуйте простые команды: привет, помощь, тест';
}

// Обработчик команды /start
composer.start(async (ctx) => {
    console.log('/start from:', ctx.from.id);
    
    const message = `🤖 *Hi! I\'m Gjob!*\n\n` +
                   `I\'m your AI assistant ready to help!\n\n` +
                   `Try saying: hello, help, test\n\n` +
                   `*Current mode:* ${API_CONFIGS[0].name}`;
    
    try {
        await ctx.replyWithPhoto(
            'https://github.com/MatveyVue/Gjob/blob/main/Gjob.png?raw=true',
            {
                caption: message,
                parse_mode: 'Markdown'
            }
        );
    } catch (error) {
        console.error('Photo error:', error.message);
        await ctx.reply(message, { parse_mode: 'Markdown' });
    }
});

// Обработчик текстовых сообщений
composer.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    console.log('Message from', ctx.from.id, ':', text);
    
    if (text.startsWith('/')) return;
    
    await ctx.sendChatAction('typing');
    
    try {
        const response = await callAI(text);
        await ctx.reply(response);
    } catch (error) {
        console.error('Processing error:', error);
        await ctx.reply('⚠️ Произошла ошибка. Попробуйте еще раз.');
    }
});

// Убрал composer.catch чтобы избежать ошибок
// composer.catch((err, ctx) => {
//     console.error('Composer error:', err);
// });

module.exports = composer;
