import redis from "../../../../shared/redis/redis.js";

const Limits = {
    chat: 20,
    coding: 5,
    pdf: 5,
    pdfRag: 5,
    ppt: 5,
    vision: 5,
    imageAnalyzer: 5,
    search: 5,
};

const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m `;
    }

    if (minutes > 0) {
        return `${minutes}m `;
    }

    return `${secs}s`;
};

export const checkAgentLimit = async (userId, agent) => {
    try {
        const max = Limits[agent] || Limits.chat;

        const key = `rate:${userId}:${agent}`;

        const count = await redis.incr(key);

        // Set expiry for 5 hours on the first request
        if (count === 1) {
            await redis.expire(key, 60 * 60 * 5);
        }

        const ttl = await redis.ttl(key);

        if (count > max) {
            const time = formatTime(ttl);

            const error = new Error(
                `You have reached the ${agent} limit. Try again in ${time}.`
            );

            error.status = 429;

            error.data = {
                success: false,
                agent,
                limit: max,
                remainingTime: ttl,
                retryAfter: time,
                message: `You have reached the ${agent} limit (${max} requests per 5 hours). Try again in ${time}.`,
            };

            throw error;
        }

        return {
            success: true,
            agent,
            limit: max,
            count,
            remaining: max - count,
        };
    } catch (error) {
        console.log(error);
        throw error;
    }
};