// src/pages/secretary/BulkNotificationsPage.tsx
// صفحة إرسال الإشعارات الجماعية
// Page for sending bulk notifications via WhatsApp/System.

import { useState, useEffect } from 'react';
import { classroomService, Classroom } from '@/services/classroomService';
import { whatsappService } from '@/services/whatsappService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Send, MessageCircle, Bell } from 'lucide-react';

export default function BulkNotificationsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [target, setTarget] = useState('all'); // 'all' | 'classroom'
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState('whatsapp'); // 'whatsapp' | 'system'
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    classroomService.getClassrooms().then(data => setClassrooms(data as any));
  }, []);

  async function handleSend() {
    if (!message.trim()) {
      toast.error('الرجاء كتابة نص الرسالة');
      return;
    }

    setLoading(true);
    try {
      // In a real app, we would fetch the phone numbers of the selected target group here
      const mockPhones = ['201000000001', '201000000002']; 
      
      if (channel === 'whatsapp') {
        await whatsappService.sendBulkMessage(mockPhones, message);
        toast.success(`تم إرسال رسائل واتساب بنجاح إلى ${target === 'all' ? 'الجميع' : 'الفصل المحدد'}`);
      } else {
        // System notification logic would go here
        toast.success('تم إرسال الإشعارات للنظام');
      }
      
      setMessage('');
    } catch (error) {
      console.error(error);
      toast.error('فشل الإرسال');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-6 w-6 text-green-600" />
        <h1 className="text-3xl font-bold tracking-tight">إرسال تنبيهات جماعية</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>إعدادات الرسالة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Channel Selection */}
          <div className="space-y-3">
            <Label>قناة الإرسال</Label>
            <RadioGroup defaultValue="whatsapp" onValueChange={setChannel} className="flex gap-4">
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="whatsapp" id="whatsapp" />
                <Label htmlFor="whatsapp" className="cursor-pointer flex items-center gap-1">
                  <MessageCircle className="h-4 w-4" /> واتساب
                </Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="system" id="system" />
                <Label htmlFor="system" className="cursor-pointer flex items-center gap-1">
                  <Bell className="h-4 w-4" /> إشعار تطبيق
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Target Selection */}
          <div className="space-y-3">
            <Label>الجمهور المستهدف</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الطلاب وأولياء الأمور</SelectItem>
                <SelectItem value="classroom">فصل دراسي محدد</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {target === 'classroom' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
              <Label>اختر الفصل</Label>
              <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفصل..." />
                </SelectTrigger>
                <SelectContent>
                  {classrooms.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Message Body */}
          <div className="space-y-3">
            <Label>نص الرسالة</Label>
            <Textarea 
              placeholder="اكتب رسالتك هنا..." 
              className="min-h-[150px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground text-left">
              {message.length} حرف
            </p>
          </div>

          <Button className="w-full gap-2" size="lg" onClick={handleSend} disabled={loading}>
            <Send className="h-4 w-4" />
            {loading ? 'جاري الإرسال...' : 'إرسال الآن'}
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
