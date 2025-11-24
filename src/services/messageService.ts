// src/services/messageService.ts
// خدمة الرسائل والتواصل
// Service for the Communication Center.

import { supabase } from '@/lib/supabase';

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  subject: string;
  body: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    name: string;
    role: string;
  };
}

export const messageService = {
  /**
   * Get messages for current user
   */
  async getMyMessages() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!sender_id(name, role)
      `)
      .or(`recipient_id.eq.${user.id},sender_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Message[];
  },

  /**
   * Send a new message
   */
  async sendMessage(recipientId: string, subject: string, body: string) {
    const { data: { user } } = await supabase.auth.getUser();
    // We need tenant_id, usually from user metadata or a query
    // For now, let's assume the trigger handles tenant_id or we fetch it
    // Safe fallback: fetch from users table
    const { data: userData } = await supabase.from('users').select('tenant_id').eq('auth_id', user?.id).single();

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: user?.id,
        recipient_id: recipientId,
        tenant_id: userData?.tenant_id,
        subject,
        body
      });

    if (error) throw error;
  },

  /**
   * Mark message as read
   */
  async markAsRead(id: string) {
    await supabase.from('messages').update({ is_read: true }).eq('id', id);
  }
};
