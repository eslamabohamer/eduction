import { supabase } from '@/lib/supabase';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface ChatContact {
  id: string;
  name: string;
  role: string;
  lastMessage?: Message;
  unreadCount?: number;
}

export const chatService = {
  async sendMessage(receiverId: string, content: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content
      });

    if (error) throw error;
  },

  async getMessages(contactId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as Message[];
  },

  async markAsRead(contactId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', contactId)
      .eq('receiver_id', user.id)
      .eq('is_read', false);
  },

  async getContacts() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // If teacher, get all students. If student, get teachers.
    // This is a simplified logic. In a real app, we might want a dedicated contacts table or query.
    let query = supabase.from('users').select('id, name, role');
    
    // We need to fetch the user role first to know who to fetch
    const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single();
    
    if (currentUser?.role === 'Teacher') {
      query = query.eq('role', 'Student');
    } else {
      query = query.eq('role', 'Teacher');
    }

    const { data: users, error } = await query;
    if (error) throw error;

    return users as ChatContact[];
  },
  
  subscribeToMessages(callback: (msg: Message) => void) {
    return supabase
      .channel('public:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, (payload) => {
        callback(payload.new as Message);
      })
      .subscribe();
  }
};
