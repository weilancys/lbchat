import webpush from 'web-push';
import { prisma } from '../config/database.js';

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@lbchat.local',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

// Subscribe a user to push notifications
export const subscribe = async (userId, subscription) => {
    const { endpoint, keys } = subscription;

    await prisma.pushSubscription.upsert({
        where: { endpoint },
        update: {
            p256dh: keys.p256dh,
            auth: keys.auth
        },
        create: {
            userId,
            endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth
        }
    });
};

// Unsubscribe from push notifications
export const unsubscribe = async (endpoint) => {
    await prisma.pushSubscription.delete({
        where: { endpoint }
    });
};

// Send push notification to a user
export const sendPushNotification = async (userId, payload) => {
    try {
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId }
        });

        const notifications = subscriptions.map(async (sub) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            try {
                await webpush.sendNotification(
                    pushSubscription,
                    JSON.stringify(payload)
                );
            } catch (error) {
                if (error.statusCode === 410 || error.statusCode === 404) {
                    // Subscription expired or invalid, remove it
                    await prisma.pushSubscription.delete({
                        where: { endpoint: sub.endpoint }
                    });
                }
                throw error;
            }
        });

        await Promise.allSettled(notifications);
    } catch (error) {
        console.error('Push notification error:', error);
    }
};

// Send notification for new message
export const notifyNewMessage = async (message, recipientIds) => {
    const payload = {
        type: 'message',
        title: message.sender.displayName || message.sender.username,
        body: message.type === 'TEXT'
            ? message.content?.substring(0, 100)
            : `Sent a ${message.type.toLowerCase()}`,
        data: {
            conversationId: message.conversationId,
            messageId: message.id
        }
    };

    for (const recipientId of recipientIds) {
        if (recipientId !== message.senderId) {
            await sendPushNotification(recipientId, payload);
        }
    }
};

// Send notification for incoming call
export const notifyIncomingCall = async (targetUserId, caller, callType) => {
    const payload = {
        type: 'call',
        title: 'Incoming Call',
        body: `${caller.displayName || caller.username} is calling...`,
        data: {
            callerId: caller.id,
            callType
        }
    };

    await sendPushNotification(targetUserId, payload);
};
