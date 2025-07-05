import { addDoc, collection, query, where, onSnapshot, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Notification {
  id: string;
  type: 'tag' | 'comment' | 'like' | 'mention';
  title: string;
  message: string;
  targetUser: string;
  targetDeviceId: string;
  fromUser: string;
  fromDeviceId: string;
  mediaId?: string;
  mediaType?: string;
  mediaUrl?: string;
  read: boolean;
  createdAt: string;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class NotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HuWukJyLO-AqAKv-cq2WlJhKONHQLU6R2WJN4YEOGMfWb2OFy3pR8JI-6U'; // Replace with your VAPID key

  async init() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        // Register service worker
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker registered');
        
        // Request notification permission
        await this.requestPermission();
        
        return true;
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
        return false;
      }
    }
    return false;
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async subscribeToPush(userName: string, deviceId: string): Promise<boolean> {
    if (!this.registration) {
      console.error('Service Worker not registered');
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      // Store subscription in Firebase
      await addDoc(collection(db, 'pushSubscriptions'), {
        userName,
        deviceId,
        subscription: JSON.stringify(subscription),
        createdAt: new Date().toISOString()
      });

      console.log('✅ Push subscription created');
      return true;
    } catch (error) {
      console.error('❌ Push subscription failed:', error);
      return false;
    }
  }

  async sendTagNotification(
    taggedUser: string,
    taggedDeviceId: string,
    taggerUser: string,
    taggerDeviceId: string,
    mediaId: string,
    mediaType: string,
    mediaUrl?: string
  ): Promise<void> {
    try {
      // Create notification in Firebase
      const notification = {
        type: 'tag',
        title: 'Du wurdest markiert!',
        message: `${taggerUser} hat dich in einem ${mediaType === 'video' ? 'Video' : 'Foto'} markiert`,
        targetUser: taggedUser,
        targetDeviceId: taggedDeviceId,
        fromUser: taggerUser,
        fromDeviceId: taggerDeviceId,
        mediaId: mediaId,
        mediaType: mediaType,
        mediaUrl: mediaUrl || '',
        read: false,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'notifications'), notification);

      // Send browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          tag: `tag-${mediaId}`,
          data: {
            mediaId,
            type: 'tag'
          }
        });
      }

      console.log('✅ Tag notification sent');
    } catch (error) {
      console.error('❌ Failed to send tag notification:', error);
    }
  }

  async sendCommentNotification(
    mediaOwner: string,
    mediaOwnerDeviceId: string,
    commenterUser: string,
    commenterDeviceId: string,
    mediaId: string,
    commentText: string
  ): Promise<void> {
    if (mediaOwner === commenterUser && mediaOwnerDeviceId === commenterDeviceId) {
      return; // Don't notify yourself
    }

    try {
      const notification: Omit<Notification, 'id'> = {
        type: 'comment',
        title: 'Neuer Kommentar',
        message: `${commenterUser} hat dein Foto kommentiert: "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
        targetUser: mediaOwner,
        targetDeviceId: mediaOwnerDeviceId,
        fromUser: commenterUser,
        fromDeviceId: commenterDeviceId,
        mediaId,
        read: false,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'notifications'), notification);

      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          tag: `comment-${mediaId}`,
          data: {
            mediaId,
            type: 'comment'
          }
        });
      }

      console.log('✅ Comment notification sent');
    } catch (error) {
      console.error('❌ Failed to send comment notification:', error);
    }
  }

  async sendLikeNotification(
    mediaOwner: string,
    mediaOwnerDeviceId: string,
    likerUser: string,
    likerDeviceId: string,
    mediaId: string
  ): Promise<void> {
    if (mediaOwner === likerUser && mediaOwnerDeviceId === likerDeviceId) {
      return; // Don't notify yourself
    }

    try {
      const notification: Omit<Notification, 'id'> = {
        type: 'like',
        title: 'Neues Like',
        message: `${likerUser} gefällt dein Foto`,
        targetUser: mediaOwner,
        targetDeviceId: mediaOwnerDeviceId,
        fromUser: likerUser,
        fromDeviceId: likerDeviceId,
        mediaId,
        read: false,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'notifications'), notification);

      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          tag: `like-${mediaId}`,
          data: {
            mediaId,
            type: 'like'
          }
        });
      }

      console.log('✅ Like notification sent');
    } catch (error) {
      console.error('❌ Failed to send like notification:', error);
    }
  }

  subscribeToNotifications(
    userName: string,
    deviceId: string,
    callback: (notifications: Notification[]) => void
  ) {
    const q = query(
      collection(db, 'notifications'),
      where('targetUser', '==', userName),
      where('targetDeviceId', '==', deviceId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications: Notification[] = [];
      snapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data()
        } as Notification);
      });
      console.log('📬 Loaded notifications:', notifications.length);
      callback(notifications);
    }, (error) => {
      console.error('❌ Notification subscription error:', error);
    });
  }

  async getUnreadCount(userName: string, deviceId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('targetUser', '==', userName),
        where('targetDeviceId', '==', deviceId),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('❌ Failed to get unread count:', error);
      return 0;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const notificationService = new NotificationService();

// Export standalone functions for easier use in components
export const subscribeToNotifications = (
  userName: string,
  deviceId: string,
  callback: (notifications: Notification[]) => void
) => {
  return notificationService.subscribeToNotifications(userName, deviceId, callback);
};

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const { doc, updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true
    });
  } catch (error) {
    console.error('❌ Failed to mark notification as read:', error);
  }
};

export const markAllNotificationsAsRead = async (userName: string, deviceId: string) => {
  try {
    const { query, where, getDocs, doc, updateDoc } = await import('firebase/firestore');
    const q = query(
      collection(db, 'notifications'),
      where('targetUser', '==', userName),
      where('targetDeviceId', '==', deviceId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(docSnapshot => 
      updateDoc(doc(db, 'notifications', docSnapshot.id), { read: true })
    );
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('❌ Failed to mark all notifications as read:', error);
  }
};

// Initialize push notifications for Android/iPhone
export const initializePushNotifications = async (): Promise<boolean> => {
  try {
    // Check if service workers and notifications are supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('❌ Push notifications not supported on this device');
      return false;
    }

    // Request notification permission with better UX
    let permission = Notification.permission;
    
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    
    if (permission !== 'granted') {
      console.warn('❌ Notification permission denied');
      return false;
    }

    // Register enhanced service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    console.log('✅ Service Worker registered and ready');

    // For real Android/iPhone notifications, you would normally subscribe here
    // with VAPID keys, but for local testing we'll setup the foundation
    try {
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (!existingSubscription) {
        // For production, add your VAPID public key here
        // const subscription = await registration.pushManager.subscribe({
        //   userVisibleOnly: true,
        //   applicationServerKey: urlBase64ToUint8Array('YOUR_VAPID_PUBLIC_KEY')
        // });
        
        console.log('✅ Ready for push notifications (VAPID setup needed for production)');
      } else {
        console.log('✅ Already subscribed to push notifications');
      }
      
      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'NAVIGATE_TO_MEDIA') {
          handleServiceWorkerNavigation(event.data);
        }
      });
      
      return true;
    } catch (subscriptionError) {
      console.error('❌ Push subscription setup failed:', subscriptionError);
      // Still return true as local notifications work
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to initialize push notifications:', error);
    return false;
  }
};

// Handle navigation messages from service worker
const handleServiceWorkerNavigation = (data: any) => {
  const { mediaId, url } = data;
  
  if (mediaId) {
    // Trigger navigation to specific media
    window.dispatchEvent(new CustomEvent('navigateToMedia', {
      detail: { mediaId }
    }));
  } else if (url) {
    // Navigate to specific URL
    window.location.href = url;
  }
};

// Send real push notification (for production with backend)
export const sendPushNotification = async (
  subscription: PushSubscription,
  payload: {
    title: string;
    message: string;
    mediaId?: string;
    type: string;
    icon?: string;
    image?: string;
  }
) => {
  // This would be called from your backend server with proper VAPID keys
  // Here's the structure for when you implement the backend push service
  
  const notificationPayload = {
    title: payload.title,
    body: payload.message,
    icon: payload.icon || '/icon-192x192.png',
    badge: '/icon-72x72.png',
    image: payload.image,
    data: {
      mediaId: payload.mediaId,
      type: payload.type,
      url: payload.mediaId ? `/?media=${payload.mediaId}` : '/'
    },
    tag: `wedding-${payload.type}`,
    requireInteraction: false,
    vibrate: [200, 100, 200]
  };

  // In production, send this to your backend push service
  console.log('📱 Push notification payload ready:', notificationPayload);
  return notificationPayload;
};