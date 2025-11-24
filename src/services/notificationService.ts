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

import { ServiceResponse } from '@/types/service';

export const notificationService = {
  async getNotifications(): Promise<ServiceResponse<Notification[]>> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true, data: data as Notification[] };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  async markAsRead(id: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  async markAllAsRead(): Promise<ServiceResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: { message: 'Not authenticated' } };

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  /**
   * Trigger the database function to check and generate notifications
   * This should be called periodically or on app load
   */
  async checkNotifications(): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase.rpc('check_and_send_notifications');
      if (error) {
        console.error('Failed to check notifications:', error);
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true };
    } catch (err: any) {
      console.error('Error checking notifications:', err);
      return { success: false, error: { message: err.message } };
    }
  }
};
