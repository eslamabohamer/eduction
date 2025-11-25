import { useEffect, useState, useRef } from 'react';
import { chatService, ChatContact, Message } from '@/services/chatService';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, User, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { arEG } from 'date-fns/locale';
import { toast } from 'sonner';

export default function ChatPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadContacts();
    
    const subscription = chatService.subscribeToMessages((msg) => {
      if (
        (selectedContact && msg.sender_id === selectedContact.id) || 
        (msg.sender_id === user?.id && msg.receiver_id === selectedContact?.id)
      ) {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
      }
    });

    return () => { subscription.unsubscribe(); };
  }, [selectedContact, user]);

  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact.id);
    }
  }, [selectedContact]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  async function loadContacts() {
    try {
      const data = await chatService.getContacts();
      setContacts(data);
    } catch (error) {
      console.error(error);
      toast.error('فشل تحميل جهات الاتصال');
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(contactId: string) {
    try {
      const data = await chatService.getMessages(contactId);
      setMessages(data);
      scrollToBottom();
      chatService.markAsRead(contactId);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;

    try {
      await chatService.sendMessage(selectedContact.id, newMessage);
      setNewMessage('');
      // Optimistic update is handled by subscription, but we can add it here too if needed
    } catch (error) {
      console.error(error);
      toast.error('فشل إرسال الرسالة');
    }
  }

  return (
    <div className="h-[calc(100vh-2rem)] md:h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-4">
      {/* Contacts List */}
      <Card className={`w-full md:w-80 flex flex-col ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            المحادثات
          </h2>
        </div>
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">جاري التحميل...</div>
          ) : contacts.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">لا توجد جهات اتصال</div>
          ) : (
            <div className="flex flex-col">
              {contacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-right border-b last:border-0 ${
                    selectedContact?.id === contact.id ? 'bg-muted' : ''
                  }`}
                >
                  <Avatar>
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${contact.name}`} />
                    <AvatarFallback><User /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <div className="font-medium truncate">{contact.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {contact.role === 'Teacher' ? 'معلم' : 'طالب'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className={`flex-1 flex flex-col overflow-hidden ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
        {selectedContact ? (
          <>
            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden" 
                  onClick={() => setSelectedContact(null)}
                >
                  <span className="text-xl">→</span>
                </Button>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedContact.name}`} />
                  <AvatarFallback><User /></AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-sm">{selectedContact.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedContact.role === 'Teacher' ? 'معلم' : 'طالب'}
                  </div>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg, i) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div
                      key={msg.id || i}
                      className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          isMe
                            ? 'bg-primary text-primary-foreground rounded-tr-none'
                            : 'bg-muted text-foreground rounded-tl-none'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <span className="text-[10px] opacity-70 block mt-1 text-left">
                          {format(new Date(msg.created_at), 'p', { locale: arEG })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t bg-background">
              <form onSubmit={handleSend} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="اكتب رسالتك هنا..."
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4">
            <MessageSquare className="h-16 w-16 opacity-20" />
            <p>اختر شخصاً للبدء في المحادثة</p>
          </div>
        )}
      </Card>
    </div>
  );
}
