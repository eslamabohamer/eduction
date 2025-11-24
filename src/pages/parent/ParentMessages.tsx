// src/pages/parent/ParentMessages.tsx
// مركز التواصل (رسائل أولياء الأمور)
// Communication center for parents.

import { useEffect, useState } from 'react';
import { messageService, Message } from '@/services/messageService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { arEG } from 'date-fns/locale';
import { toast } from 'sonner';

export default function ParentMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    try {
      const response = await messageService.getMyMessages();
      if (response.success && response.data) {
        setMessages(response.data);
      } else {
        toast.error(response.error?.message || 'فشل تحميل الرسائل');
      }
    } catch (error) {
      console.error(error);
      toast.error('فشل تحميل الرسائل');
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!subject || !body) return;
    // In a real app, we'd pick a specific teacher or admin.
    // For MVP, we'll send to a placeholder ID or handle in backend trigger to notify admins.
    // Here we assume there's a way to get the teacher's ID, but simpler is to just create a message
    // and let admins see all messages sent to the tenant.

    toast.info('ميزة إرسال الرسائل قيد التطوير');
    setIsDialogOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">مركز التواصل</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Send className="h-4 w-4" />
              رسالة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إرسال رسالة للإدارة/المعلم</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>الموضوع</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>الرسالة</Label>
                <Textarea value={body} onChange={e => setBody(e.target.value)} rows={5} />
              </div>
              <Button className="w-full" onClick={handleSend}>إرسال</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <Card className="h-[calc(100vh-200px)]">
          <CardHeader>
            <CardTitle className="text-lg">صندوق الوارد</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {messages.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  لا توجد رسائل
                </div>
              ) : (
                <div className="divide-y">
                  {messages.map((msg) => (
                    <div key={msg.id} className="p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm">{msg.sender?.name || 'مستخدم'}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: arEG })}
                        </span>
                      </div>
                      <div className="text-sm font-medium">{msg.subject}</div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{msg.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="h-[calc(100vh-200px)] flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
          <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
          <p>اختر رسالة لعرضها</p>
        </Card>
      </div>
    </div>
  );
}
