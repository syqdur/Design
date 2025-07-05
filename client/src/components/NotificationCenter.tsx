import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { subscribeToNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationService';

interface Notification {
  id: string;
  type: 'comment' | 'like' | 'tag' | 'test';
  fromUser: string;
  fromDeviceId: string;
  targetUser: string;
  targetDeviceId: string;
  mediaId: string;
  mediaUrl: string;
  mediaType?: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface NotificationCenterProps {
  userName: string;
  deviceId: string;
  isDarkMode: boolean;
  onNavigateToMedia?: (mediaId: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userName,
  deviceId,
  isDarkMode,
  onNavigateToMedia
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userName || !deviceId) return;

    console.log('🔔 Setting up notification subscription for:', userName, `(${deviceId})`);
    
    const unsubscribe = subscribeToNotifications(userName, deviceId, (newNotifications) => {
      console.log('📬 Loaded notifications:', newNotifications.length);
      console.log('📬 Received notifications:', newNotifications);
      setNotifications(newNotifications);
      
      const unread = newNotifications.filter(n => !n.read).length;
      console.log('📊 Calculated unread count:', unread);
      setUnreadCount(unread);
    });

    return unsubscribe;
  }, [userName, deviceId]);

  const handleNotificationClick = (notification: Notification) => {
    console.log('🔔 Notification clicked:', notification);
    
    if (!notification.read) {
      markNotificationAsRead(notification.id);
    }
    
    if (onNavigateToMedia && notification.mediaId && notification.mediaId !== 'test') {
      onNavigateToMedia(notification.mediaId);
    }
    
    setIsOpen(false);
  };

  const markAllAsRead = () => {
    if (notifications.length > 0) {
      markAllNotificationsAsRead(userName, deviceId);
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
      
      if (diffInMinutes < 1) return 'Jetzt';
      if (diffInMinutes < 60) return `vor ${diffInMinutes}m`;
      if (diffInMinutes < 1440) return `vor ${Math.floor(diffInMinutes / 60)}h`;
      return `vor ${Math.floor(diffInMinutes / 1440)}d`;
    } catch {
      return '';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'comment': return '💬';
      case 'like': return '❤️';
      case 'tag': return '🏷️';
      default: return '🔔';
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => {
          console.log('🔔 Notification bell clicked! Current state:', isOpen);
          console.log('📬 Current notifications:', notifications.length);
          console.log('📊 Unread count:', unreadCount);
          setIsOpen(!isOpen);
          console.log('🔔 New state will be:', !isOpen);
        }}
        className={`relative p-3 rounded-full transition-all duration-300 ${
          isDarkMode 
            ? 'hover:bg-gray-700 text-gray-300 hover:text-white' 
            : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
        }`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Mobile overlay */}
          <div 
            className="fixed inset-0 bg-black/20 z-[99998] sm:hidden" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className={`absolute top-full mt-2 z-[99999] w-[calc(100vw-1rem)] left-[-10rem] sm:w-80 sm:left-auto sm:right-0 max-w-sm rounded-2xl shadow-2xl border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-600' 
              : 'bg-white border-gray-200'
          }`} style={{ zIndex: 99999 }}>
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b ${
              isDarkMode ? 'border-gray-600' : 'border-gray-200'
            }`}>
              <h3 className={`font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Benachrichtigungen
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                      isDarkMode 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    Alle lesen
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-1 rounded-lg transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className={`p-8 text-center ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Keine Benachrichtigungen</p>
                </div>
              ) : (
                <div className="py-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 cursor-pointer transition-colors border-l-4 ${
                        !notification.read
                          ? isDarkMode
                            ? 'bg-blue-900/20 border-blue-500 hover:bg-blue-900/30'
                            : 'bg-blue-50 border-blue-500 hover:bg-blue-100'
                          : isDarkMode
                            ? 'bg-transparent border-transparent hover:bg-gray-700/50'
                            : 'bg-transparent border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5" role="img" aria-label="notification-icon">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {notification.title}
                          </p>
                          <p className={`text-xs mt-1 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {notification.message}
                          </p>
                          <p className={`text-xs mt-1 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {formatTime(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};