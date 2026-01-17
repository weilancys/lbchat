// LBChat Service Worker for Push Notifications

self.addEventListener('install', (event) => {
    console.log('Service Worker installed');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
    event.waitUntil(clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();

        const options = {
            body: data.body,
            icon: '/icon-192.png',
            badge: '/badge-72.png',
            tag: data.type,
            data: data.data,
            vibrate: [200, 100, 200],
            actions: []
        };

        // Add actions based on notification type
        if (data.type === 'message') {
            options.actions = [
                { action: 'reply', title: 'Reply' },
                { action: 'view', title: 'View' }
            ];
        } else if (data.type === 'call') {
            options.requireInteraction = true;
            options.actions = [
                { action: 'answer', title: 'Answer' },
                { action: 'decline', title: 'Decline' }
            ];
        }

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    } catch (error) {
        console.error('Push notification error:', error);
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const data = event.notification.data;
    let url = '/';

    if (data?.conversationId) {
        url = `/chat/${data.conversationId}`;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Focus existing window if available
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(url);
                        return client.focus();
                    }
                }
                // Open new window if no existing window
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

// Handle notification actions
self.addEventListener('notificationaction', (event) => {
    const action = event.action;
    const data = event.notification.data;

    if (action === 'reply') {
        // Open the chat with focus on input
        event.waitUntil(
            clients.openWindow(`/chat/${data.conversationId}?focus=input`)
        );
    } else if (action === 'view') {
        event.waitUntil(
            clients.openWindow(`/chat/${data.conversationId}`)
        );
    } else if (action === 'answer') {
        // Handle call answer - need to communicate with main app
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                clientList.forEach((client) => {
                    client.postMessage({
                        type: 'ANSWER_CALL',
                        callerId: data.callerId
                    });
                });
            })
        );
    } else if (action === 'decline') {
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                clientList.forEach((client) => {
                    client.postMessage({
                        type: 'DECLINE_CALL',
                        callerId: data.callerId
                    });
                });
            })
        );
    }
});
