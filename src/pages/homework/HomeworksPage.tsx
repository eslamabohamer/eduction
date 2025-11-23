// src/pages/homework/HomeworksPage.tsx
// صفحة إدارة الواجبات للمعلم
// Page for teachers to manage homework assignments.

import { useEffect, useState } from 'react';
import { homeworkService, Homework } from '@/services/homeworkService';
import { classroomService, Classroom } from '@/services/classroomService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar, BookCheck } from 'lucide-react';
import { format } from 'date-fns';
import { arEG } from 'date-fns/locale';
import { toast } from 'sonner';
import { HomeworkSubmissionsDialog } from '@/components/homework/HomeworkSubmissionsDialog';

export default function HomeworksPage() {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Grading Dialog State
  const [gradingHomeworkId, setGradingHomeworkId] = useState<string | null>(null);
  const [gradingHomeworkTitle, setGradingHomeworkTitle] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classroom_id: '',
    due_date: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [hwData, clsData] = await Promise.all([
        homeworkService.getHomeworks(),
        classroomService.getClassrooms()
      ]);
      setHomeworks(hwData);
      setClassrooms(clsData as any);
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
      await homeworkService.createHomework({
        ...formData,
        due_date: new Date(formData.due_date).toISOString()
      });
      toast.success('تم إضافة الواجب بنجاح');
      setIsDialogOpen(false);
      setFormData({ title: '', description: '', classroom_id: '', due_date: '' });
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('فشل إضافة الواجب');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">الواجبات المدرسية</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة واجب
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة واجب جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>عنوان الواجب</Label>
                <Input 
                  required 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="مثال: حل تمارين ص 50"
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

              <div className="space-y-2">
                <Label>تاريخ التسليم</Label>
                <Input 
                  type="datetime-local"
                  required 
                  value={formData.due_date}
                  onChange={e => setFormData({...formData, due_date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>الوصف / التعليمات</Label>
                <Textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="تفاصيل الواجب..."
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
        ) : homeworks.length === 0 ? (
          <div className="col-span-full text-center py-12 border rounded-lg bg-muted/10">
            <BookCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">لا توجد واجبات</h3>
            <p className="text-muted-foreground mb-4">قم بإنشاء واجبك الأول للطلاب</p>
            <Button variant="outline" onClick={() => setIsDialogOpen(true)}>إنشاء واجب</Button>
          </div>
        ) : (
          homeworks.map((hw) => (
            <Card key={hw.id}>
              <CardHeader>
                <CardTitle className="text-lg line-clamp-1">{hw.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{hw.classroom?.name}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm line-clamp-2 text-muted-foreground min-h-[40px]">{hw.description}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/20 p-2 rounded">
                  <Calendar className="h-4 w-4" />
                  <span>تسليم: {format(new Date(hw.due_date), 'PPP', { locale: arEG })}</span>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  size="sm"
                  onClick={() => {
                    setGradingHomeworkId(hw.id);
                    setGradingHomeworkTitle(hw.title);
                  }}
                >
                  عرض التسليمات وتصحيح
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <HomeworkSubmissionsDialog 
        open={!!gradingHomeworkId} 
        onOpenChange={(open) => !open && setGradingHomeworkId(null)}
        homeworkId={gradingHomeworkId}
        homeworkTitle={gradingHomeworkTitle}
      />
    </div>
  );
}
