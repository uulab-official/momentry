import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function routeFromNotification(notification: Notifications.Notification) {
  const value = notification.request.content.data?.url;
  if (typeof value !== 'string' || !/^\/(?:notifications|settings(?:\/[a-z-]+)?|notice|faq|privacy|terms|entry\/(?:new|[1-9]\d*))(?:\?.*)?$/.test(value)) return null;
  return value;
}

export function NotificationObserver() {
  const router = useRouter();
  const handledResponse = useRef<string | null>(null);

  useEffect(() => {
    const openNotification = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const responseId = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      if (handledResponse.current === responseId) return;
      handledResponse.current = responseId;
      const route = routeFromNotification(response.notification);
      if (route) router.push(route as never);
    };

    Notifications.getLastNotificationResponseAsync().then(openNotification).catch(() => undefined);
    const subscription = Notifications.addNotificationResponseReceivedListener(openNotification);
    return () => subscription.remove();
  }, [router]);

  return null;
}
