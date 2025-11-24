// src/pages/exams/ExamsPage.tsx
// صفحة قائمة الاختبارات
// Page listing all exams.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { examService, Exam } from '@/services/examService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Calendar, Clock, FileText, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { arEG } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [examToEdit, setExamToEdit] = useState<Exam | null>(null);

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    duration_minutes: 0,
    total_marks: 0
  });

  useEffect(() => {
    loadExams();
  }, []);

  async function loadExams() {
    try {
      const data = await examService.getExams();
      setExams(data as any);
    } catch (error) {
      console.error(error);
      toast.error('فشل تحميل الاختبارات');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!examToDelete) return;
    try {
      await examService.deleteExam(examToDelete.id);
      toast.success('تم حذف الاختبار بنجاح');
      setExamToDelete(null);
      loadExams();
    } catch (error) {
      console.error(error);
      toast.error('فشل حذف الاختبار');
    }
  }

  const openEditDialog = (exam: Exam) => {
    setExamToEdit(exam);
    setEditFormData({
      title: exam.title,
      description: exam.description || '',
      start_time: exam.start_time,
      end_time: exam.end_time,
      duration_minutes: exam.duration_minutes,
      total_marks: exam.total_marks
    });
    setIsEditDialogOpen(true);
  };

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!examToEdit) return;

    try {
      await examService.updateExam(examToEdit.id, {
        ...editFormData,
        start_time: new Date(editFormData.start_time).toISOString(),
        end_time: new Date(editFormData.end_time).toISOString()
      });
      toast.success('تم تحديث الاختبار بنجاح');
      setIsEditDialogOpen(false);
      setExamToEdit(null);
      loadExams();
    } catch (error) {
      console.error(error);
      toast.error('فشل تحديث الاختبار');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">الاختبارات</h1>
        <Link to="/exams/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            إنشاء اختبار جديد
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p>جاري التحميل...</p>
        ) : exams.length === 0 ? (
          <div className="col-span-full text-center py-12 border rounded-lg bg-muted/10">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">لا توجد اختبارات</h3>
            <p className="text-muted-foreground mb-4">قم بإنشاء اختبارك الأول للطلاب</p>
            <Link to="/exams/create">
              <Button variant="outline">إنشاء اختبار</Button>
            </Link>
          </div>
        ) : (
          exams.map((exam) => (
            <Card key={exam.id} className="hover:shadow-md transition-shadow relative group">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-semibold line-clamp-1">{exam.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${exam.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                      {exam.status === 'published' ? 'منشور' : 'مسودة'}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">فتح القائمة</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(exam)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setExamToDelete(exam)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{exam.classroom?.name}</p>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(exam.start_time), 'PPP', { locale: arEG })}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{exam.duration_minutes} دقيقة</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t mt-4">
                  <div className="text-xs text-muted-foreground">
                    {exam._count?.questions} سؤال • {exam.total_marks} درجة
                  </div>
                  <Button variant="ghost" size="sm" className="h-8">التفاصيل</Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعديل الاختبار</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>عنوان الاختبار</Label>
              <Input
                required
                value={editFormData.title}
                onChange={e => setEditFormData({ ...editFormData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={editFormData.description}
                onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>وقت البدء</Label>
                <Input
                  type="datetime-local"
                  required
                  value={editFormData.start_time}
                  onChange={e => setEditFormData({ ...editFormData, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>وقت الانتهاء</Label>
                <Input
                  type="datetime-local"
                  required
                  value={editFormData.end_time}
                  onChange={e => setEditFormData({ ...editFormData, end_time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المدة (دقيقة)</Label>
                <Input
                  type="number"
                  required
                  value={editFormData.duration_minutes}
                  onChange={e => setEditFormData({ ...editFormData, duration_minutes: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>الدرجة الكلية</Label>
                <Input
                  type="number"
                  required
                  value={editFormData.total_marks}
                  onChange={e => setEditFormData({ ...editFormData, total_marks: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <Button type="submit" className="w-full">حفظ التعديلات</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!examToDelete} onOpenChange={(open) => !open && setExamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد تماماً؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الاختبار <strong>{examToDelete?.title}</strong> وجميع الأسئلة والنتائج المرتبطة به. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
