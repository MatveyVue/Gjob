const { Composer } = require('telegraf');
const axios = require('axios');
const crypto = require('crypto');

const composer = new Composer();

console.log('🤖 Gjob bot loaded');

const API_KEY = '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';

const SYSTEM_PROMPT =
    'Твое имя Gjob. Ты AI помощник в Telegram боте. Отвечай кратко. ' +
    'Всегда говори что тебя зовут Gjob когда спрашивают о твоем имени.';

// Обычная текстовая модель
const TEXT_MODEL = 'openai/gpt-3.5-turbo';
// Модель с поддержкой изображений (vision) — нужна для разбора фото
const VISION_MODEL = 'openai/gpt-4o-mini';

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
// timeoutMs можно уменьшать для инлайна, т.к. Telegram ждёт ответ на инлайн-запрос не дольше ~10 сек
async function callAI(prompt, { model = TEXT_MODEL, timeoutMs = 15000 } = {}) {
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model,
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
                timeout: timeoutMs
            }
        );

        return response.data.choices?.[0]?.message?.content?.trim()
            || "I couldn't generate a response.";
    } catch (error) {
        console.log('API error:', error.response?.data || error.message);
        return "I'm having trouble connecting right now.";
    }
}

// Потоковый вызов — эмулирует "печатает в реальном времени",
// редактируя сообщение по мере получения кусков текста от модели.
// Принимает готовый массив messages, чтобы им можно было переиспользовать
// как для обычного текста, так и для запросов с картинками (vision).
async function streamChatResponse(ctx, messages, sentMessage, { model = TEXT_MODEL, maxTokens = 700 } = {}) {
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
            if (!String(err.message).includes('not modified')) {
                console.log('Edit error:', err.message);
            }
        }
    }

    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model,
                messages,
                max_tokens: maxTokens,
                stream: true
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'stream',
                timeout: 60000
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
                                await safeEdit(fullText + ' ▌');
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

        await safeEdit(fullText.trim() || "I couldn't generate a response.");
    } catch (error) {
        console.log('Stream error:', error.response?.data || error.message);
        await safeEdit("Возникли проблемы с подключением. Попробуй ещё раз чуть позже.");
    }
}

composer.start(async (ctx) => {
    try {
        await ctx.replyWithPhoto(
            'https://github.com/MatveyVue/Gjob/blob/main/Gjob.png?raw=true',
            {
                caption: '🤖 Hi! I\'m Gjob!\n\n' +
                    'Пиши мне в личку или отмечай в группе.\n' +
                    'В инлайне: @your_bot_username <вопрос>\n' +
                    'Рисую картинки: просто напиши "нарисуй ...".\n' +
                    'Присылай фото задания — разберу и решу.',
                parse_mode: 'Markdown'
            }
        );
    } catch (error) {
        await ctx.reply('🤖 Hi! I\'m Gjob!');
    }
});

// ===== ИНЛАЙН-РЕЖИМ =====
// Вызов в любом чате: @botusername <запрос>
// Важно: инлайн-режим должен быть включён у @BotFather командой /setinline
composer.on('inline_query', async (ctx) => {
    const query = ctx.inlineQuery.query?.trim();

    if (!query) {
        return ctx.answerInlineQuery([
            {
                type: 'article',
                id: crypto.randomUUID(),
                title: 'Введите вопрос...',
                description: 'Например: "объясни фотосинтез" или "нарисуй кота"',
                input_message_content: { message_text: '🤖 Gjob готов помочь!' }
            }
        ], { cache_time: 0 });
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

        // Короткий таймаут: Telegram отменяет инлайн-запрос примерно через 10 секунд
        const answer = await callAI(query, { timeoutMs: 8000 });

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
        console.log('Inline query error:', error.response?.data || error.message);
        return ctx.answerInlineQuery([], { cache_time: 0 });
    }
});

// ===== ФОТО: разбор и решение заданий с картинки =====
composer.on('photo', async (ctx) => {
    try {
        // Берём фото в максимальном разрешении (последнее в массиве sizes)
        const photos = ctx.message.photo;
        const bestPhoto = photos[photos.length - 1];
        const fileLink = await ctx.telegram.getFileLink(bestPhoto.file_id);

        const caption = ctx.message.caption?.trim();
        const userPrompt = caption
            ? caption
            : 'На фото задание/пример. Реши его и объясни ход решения кратко и по шагам.';

        await ctx.sendChatAction('typing');

        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            {
                role: 'user',
                content: [
                    { type: 'text', text: userPrompt },
                    { type: 'image_url', image_url: { url: fileLink.href } }
                ]
            }
        ];

        const sentMessage = await ctx.reply('👀 Смотрю на фото...');
        await streamChatResponse(ctx, messages, sentMessage, { model: VISION_MODEL, maxTokens: 900 });
    } catch (error) {
        console.log('Photo handler error:', error.response?.data || error.message);
        await ctx.reply('Не получилось разобрать фото, попробуй ещё раз.');
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
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: processedText }
        ];
        const sentMessage = await ctx.reply('...');
        await streamChatResponse(ctx, messages, sentMessage, { model: TEXT_MODEL, maxTokens: 500 });
    } catch (error) {
        console.log('Text handler error:', error.message);
        await ctx.reply('Please try again.');
    }
});

module.exports = composer;
