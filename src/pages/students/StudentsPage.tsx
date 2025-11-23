// src/pages/students/StudentsPage.tsx
// إضافة زر العرض السريع للصفحة
// Add Quick View button to the page.

import { useEffect, useState } from 'react';
import { studentService, StudentWithUser } from '@/services/studentService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { StudentQuickView } from '@/components/students/StudentQuickView';

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    grade: '',
    level: ''
  });

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    try {
      const data = await studentService.getStudents();
      setStudents(data);
    } catch (error) {
      console.error(error);
      toast.error('فشل تحميل قائمة الطلاب');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await studentService.createStudent(formData);
      toast.success('تم إضافة الطالب بنجاح');
      setIsDialogOpen(false);
      setFormData({ name: '', username: '', grade: '', level: '' });
      loadStudents();
    } catch (error) {
      console.error(error);
      toast.error('فشل إضافة الطالب');
    }
  }

  const filteredStudents = students.filter(s => 
    s.user.name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">الطلاب</h1>
        <div className="flex gap-2">
          <StudentQuickView />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة طالب
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة طالب جديد</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>اسم الطالب</Label>
                  <Input 
                    required 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="مثال: محمد أحمد"
                  />
                </div>
                <div className="space-y-2">
                  <Label>اسم المستخدم (للدخول)</Label>
                  <Input 
                    required 
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    placeholder="مثال: mohamed2024"
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
                      placeholder="مثال: الأول الثانوي"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">حفظ</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الكود..."
            className="pr-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">الكود</TableHead>
              <TableHead className="text-right">المرحلة / الصف</TableHead>
              <TableHead className="text-right">تاريخ الإضافة</TableHead>
              <TableHead className="text-right">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">جاري التحميل...</TableCell>
              </TableRow>
            ) : filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا يوجد طلاب مضافين</TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.user.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-xs">{student.student_code}</span>
                    </div>
                  </TableCell>
                  <TableCell>{student.level} - {student.grade}</TableCell>
                  <TableCell>{new Date(student.user.created_at).toLocaleDateString('ar-EG')}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">عرض</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
