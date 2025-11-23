// src/pages/live-sessions/LiveSessionsPage.tsx
// صفحة إدارة البث المباشر للمعلم
// Page for teachers to manage live sessions.

import { useEffect, useState } from 'react';
import { liveSessionService, LiveSession } from '@/services/liveSessionService';
import { classroomService, Classroom } from '@/services/classroomService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, Plus, Calendar, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { arEG } from 'date-fns/locale';
import { toast } from 'sonner';

export default function LiveSessionsPage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    classroom_id: '',
    start_time: '',
    end_time: '',
    stream_url: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [sessionsData, classroomsData] = await Promise.all([
        liveSessionService.getSessions(),
        classroomService.getClassrooms()
      ]);
      setSessions(sessionsData);
      setClassrooms(classroomsData as any);
    } catch (error) {
      console.error(error);
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await liveSessionService.createSession({
        ...formData,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
      });
      toast.success('تم جدولة البث بنجاح');
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('فشل جدولة البث');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">البث المباشر</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              جدولة بث جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>جدولة حصة افتراضية</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>عنوان الدرس</Label>
                <Input 
                  required 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="مثال: مراجعة الفصل الأول"
                />
              </div>
              
              <div className="space-y-2">
                <Label>الفصل الدراسي</Label>
                <Select onValueChange={val => setFormData({...formData, classroom_id: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفصل" />
                  </SelectTrigger>
                  <SelectContent>
                    {classrooms.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>وقت البدء</Label>
                  <Input 
                    type="datetime-local"
                    required 
                    value={formData.start_time}
                    onChange={e => setFormData({...formData, start_time: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>وقت الانتهاء</Label>
                  <Input 
                    type="datetime-local"
                    required 
                    value={formData.end_time}
                    onChange={e => setFormData({...formData, end_time: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>رابط البث (Zoom/Meet/Teams)</Label>
                <Input 
                  required 
                  value={formData.stream_url}
                  onChange={e => setFormData({...formData, stream_url: e.target.value})}
                  placeholder="https://zoom.us/j/..."
                />
              </div>

              <Button type="submit" className="w-full">حفظ</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p>جاري التحميل...</p>
        ) : sessions.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-10">لا توجد جلسات مجدولة</p>
        ) : (
          sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">{session.title}</CardTitle>
                <Video className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-4">
                  {session.classroom?.name}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(session.start_time), 'PPP p', { locale: arEG })}</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4 gap-2" asChild>
                  <a href={session.stream_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    بدء البث
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
