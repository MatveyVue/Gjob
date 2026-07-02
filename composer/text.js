const { Composer, InlineQueryResult } = require('telegraf');
const axios = require('axios');
const crypto = require('crypto');

const composer = new Composer();

console.log('🤖 Gjob bot loaded');

// ВАЖНО: ключ лучше хранить в переменной окружения, а не в коде.
// Запускать бота так: OPENROUTER_API_KEY=sk-or-... node index.js
const API_KEY = process.env.OPENROUTER_API_KEY;

if (!API_KEY) {
    console.warn('⚠️  OPENROUTER_API_KEY не задан. Установите переменную окружения.');
}

const SYSTEM_PROMPT =
    'Твое имя Gjob. Ты AI помощник в Telegram боте. Отвечай кратко. ' +
    'Всегда говори что тебя зовут Gjob когда спрашивают о твоем имени.';

// Триггеры для генерации изображений
const IMAGE_TRIGGERS = [
    'нарисуй', 'сгенерируй фото', 'сгенерируй картинку', 'сгенерируй изображение',
    'draw', 'generate image', 'generate photo', 'нарисуй мне', 'создай картинку'
];

function isImageRequest(text) {
    const lower = text.toLowerCase();
    return IMAGE_TRIGGERS.some(trigger => lower.includes(trigger));
}

function extractImagePrompt(text) {
    let prompt = text;
    for (const trigger of IMAGE_TRIGGERS) {
        const idx = prompt.toLowerCase().indexOf(trigger);
        if (idx !== -1) {
            prompt = prompt.slice(idx + trigger.length).trim();
            break;
        }
    }
    return prompt || text;
}

// Генерация изображения через Pollinations.ai (бесплатно, без ключа)
function generateImageUrl(prompt) {
    const encoded = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 1000000);
    return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&seed=${seed}&nologo=true`;
}

// Обычный (не потоковый) вызов — используется там, где стрим не нужен (например, инлайн)
async function callAI(prompt) {
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'openai/gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 300
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        return response.data.choices?.[0]?.message?.content?.trim()
            || "I couldn't generate a response.";
    } catch (error) {
        console.log('API error:', error.message);
        return "I'm having trouble connecting right now.";
    }
}

// Потоковый вызов — эмулирует "печатает в реальном времени",
// редактируя сообщение по мере получения кусков текста от модели
async function streamAIResponse(ctx, prompt, sentMessage) {
    let fullText = '';
    let lastEditTime = 0;
    const EDIT_INTERVAL_MS = 1200; // Telegram не любит слишком частые правки сообщений

    const chatId = sentMessage.chat.id;
    const messageId = sentMessage.message_id;

    async function safeEdit(text) {
        if (!text.trim()) return;
        try {
            await ctx.telegram.editMessageText(chatId, messageId, undefined, text);
        } catch (err) {
            // Игнорируем "message is not modified" и подобные некритичные ошибки
            if (!String(err.message).includes('not modified')) {
                console.log('Edit error:', err.message);
            }
        }
    }

    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'openai/gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 500,
                stream: true
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'stream',
                timeout: 30000
            }
        );

        await new Promise((resolve, reject) => {
            response.data.on('data', async (chunk) => {
                const lines = chunk.toString('utf8').split('\n').filter(l => l.trim().startsWith('data:'));

                for (const line of lines) {
                    const payload = line.replace(/^data:\s*/, '');
                    if (payload === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(payload);
                        const delta = parsed.choices?.[0]?.delta?.content;
                        if (delta) {
                            fullText += delta;

                            const now = Date.now();
                            if (now - lastEditTime > EDIT_INTERVAL_MS) {
                                lastEditTime = now;
                                await safeEdit(fullText + ' ▌'); // курсор — эффект "печати"
                            }
                        }
                    } catch (e) {
                        // неполный JSON-чанк, пропускаем
                    }
                }
            });

            response.data.on('end', resolve);
            response.data.on('error', reject);
        });

        // Финальное редактирование — без курсора, с полным текстом
        await safeEdit(fullText.trim() || "I couldn't generate a response.");
    } catch (error) {
        console.log('Stream error:', error.message);
        await safeEdit("I'm having trouble connecting right now.");
    }
}

composer.start(async (ctx) => {
    try {
        await ctx.replyWithPhoto(
            'https://github.com/MatveyVue/Gjob/blob/main/Gjob.png?raw=true',
            {
                caption: '🤖 Hi! I\'m Gjob!\n\nSend me a message, or use me inline in any chat: @your_bot_username <question>\n\nЯ также умею рисовать картинки — просто напиши "нарисуй ...".',
                parse_mode: 'Markdown'
            }
        );
    } catch (error) {
        await ctx.reply('🤖 Hi! I\'m Gjob!');
    }
});

// ===== ИНЛАЙН-РЕЖИМ =====
// Позволяет вызывать бота в любом чате через @botusername <запрос>
composer.on('inline_query', async (ctx) => {
    const query = ctx.inlineQuery.query?.trim();

    if (!query) {
        return ctx.answerInlineQuery([], { cache_time: 0 });
    }

    try {
        if (isImageRequest(query)) {
            const prompt = extractImagePrompt(query);
            const imageUrl = generateImageUrl(prompt);

            return ctx.answerInlineQuery([
                {
                    type: 'photo',
                    id: crypto.randomUUID(),
                    photo_url: imageUrl,
                    thumbnail_url: imageUrl,
                    caption: `🎨 ${prompt}`
                }
            ], { cache_time: 0 });
        }

        const answer = await callAI(query);

        return ctx.answerInlineQuery([
            {
                type: 'article',
                id: crypto.randomUUID(),
                title: answer.slice(0, 50) || 'Gjob',
                description: answer.slice(0, 100),
                input_message_content: {
                    message_text: `🤖 ${answer}`
                }
            }
        ], { cache_time: 0 });
    } catch (error) {
        console.log('Inline query error:', error.message);
        return ctx.answerInlineQuery([], { cache_time: 0 });
    }
});

// ===== ОБЫЧНЫЕ ТЕКСТОВЫЕ СООБЩЕНИЯ (личка и группы) =====
composer.on('text', async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return;

    const isPrivateChat = ctx.chat.type === 'private';
    const botUsername = ctx.botInfo?.username || 'Gjob_bot';

    let processedText = text;

    if (!isPrivateChat) {
        const mentioned = text.includes(`@${botUsername}`);
        const repliedToBot = ctx.message.reply_to_message?.from?.id === ctx.botInfo.id;

        if (!mentioned && !repliedToBot) return;

        processedText = text.replace(`@${botUsername}`, '').trim();
        if (!processedText) {
            return ctx.reply('🤖 Да, это я! Gjob ваш помощник!');
        }
    }

    const lowerText = processedText.toLowerCase();

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

    // Генерация изображения
    if (isImageRequest(processedText)) {
        const prompt = extractImagePrompt(processedText);
        await ctx.sendChatAction('upload_photo');
        try {
            const imageUrl = generateImageUrl(prompt);
            await ctx.replyWithPhoto(imageUrl, { caption: `🎨 ${prompt}` });
        } catch (error) {
            console.log('Image gen error:', error.message);
            await ctx.reply('Не получилось сгенерировать картинку, попробуй ещё раз.');
        }
        return;
    }

    // Текстовый ответ с эффектом "печати в реальном времени"
    await ctx.sendChatAction('typing');
    try {
        const sentMessage = await ctx.reply('...');
        await streamAIResponse(ctx, processedText, sentMessage);
    } catch (error) {
        console.log('Text handler error:', error.message);
        await ctx.reply('Please try again.');
    }
});

module.exports = composer;
