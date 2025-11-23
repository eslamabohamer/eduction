// src/pages/classrooms/ClassroomsPage.tsx
// تحديث الصفحة للانتقال إلى التفاصيل عند النقر
// Update page to navigate to details on click.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { classroomService, Classroom } from '@/services/classroomService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    level: '',
    grade: ''
  });

  useEffect(() => {
    loadClassrooms();
  }, []);

  async function loadClassrooms() {
    try {
      const data = await classroomService.getClassrooms();
      setClassrooms(data as any);
    } catch (error) {
      console.error(error);
      toast.error('فشل تحميل الفصول');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await classroomService.createClassroom(formData);
      toast.success('تم إنشاء الفصل بنجاح');
      setIsDialogOpen(false);
      setFormData({ name: '', level: '', grade: '' });
      loadClassrooms();
    } catch (error) {
      console.error(error);
      toast.error('فشل إنشاء الفصل');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">الفصول الدراسية</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إنشاء فصل
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إنشاء فصل جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>اسم الفصل / المجموعة</Label>
                <Input 
                  required 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="مثال: مجموعة أ - فيزياء"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>المرحلة</Label>
                  <Input 
                    required 
                    value={formData.level}
                    onChange={e => setFormData({...formData, level: e.target.value})}
                    placeholder="مثال: الثانوية"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الصف</Label>
                  <Input 
                    required 
                    value={formData.grade}
                    onChange={e => setFormData({...formData, grade: e.target.value})}
                    placeholder="مثال: الثالث الثانوي"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">حفظ</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p>جاري التحميل...</p>
        ) : classrooms.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-10">لا توجد فصول دراسية حالياً</p>
        ) : (
          classrooms.map((classroom) => (
            <Card 
              key={classroom.id} 
              className="hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => navigate(`/classrooms/${classroom.id}`)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">{classroom.name}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-2">
                  {classroom.level} - {classroom.grade}
                </div>
                <div className="text-2xl font-bold">
                  {classroom._count?.enrollments || 0} <span className="text-sm font-normal text-muted-foreground">طالب</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
