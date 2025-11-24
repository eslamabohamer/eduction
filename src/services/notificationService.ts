// src/services/notificationService.ts
// خدمة الإشعارات
// Service for fetching and managing user notifications.

import { supabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  title: string;
  body: string;
  link?: string;
  is_read: boolean;
  created_at: string;
  type: 'info' | 'warning' | 'success';
}

export const notificationService = {
  async getNotifications() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data as Notification[];
  },

  async markAsRead(id: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) throw error;
  },

  async markAllAsRead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
  },

  /**
   * Trigger the database function to check and generate notifications
   * This should be called periodically or on app load
   */
  async checkNotifications() {
    try {
      const { error } = await supabase.rpc('check_and_send_notifications');
      if (error) console.error('Failed to check notifications:', error);
    } catch (err) {
      console.error('Error checking notifications:', err);
    }
  }
};
