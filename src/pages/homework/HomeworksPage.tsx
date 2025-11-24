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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar, BookCheck, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { arEG } from 'date-fns/locale';
import { toast } from 'sonner';
import { HomeworkSubmissionsDialog } from '@/components/homework/HomeworkSubmissionsDialog';
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

export default function HomeworksPage() {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [homeworkToEdit, setHomeworkToEdit] = useState<Homework | null>(null);
  const [homeworkToDelete, setHomeworkToDelete] = useState<Homework | null>(null);

  // Grading Dialog State
  const [gradingHomeworkId, setGradingHomeworkId] = useState<string | null>(null);
  const [gradingHomeworkTitle, setGradingHomeworkTitle] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classroom_id: '',
    due_date: ''
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [hwResponse, clsResponse] = await Promise.all([
        homeworkService.getHomeworks(),
        classroomService.getClassrooms()
      ]);

      if (hwResponse.success && hwResponse.data) {
        setHomeworks(hwResponse.data);
      } else {
        console.error(hwResponse.error);
        toast.error('فشل تحميل الواجبات');
      }

      if (clsResponse.success && clsResponse.data) {
        setClassrooms(clsResponse.data);
      } else {
        console.error(clsResponse.error);
        toast.error('فشل تحميل الفصول');
      }
    } catch (error) {
      console.error(error);
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);

    let attachment_url = undefined;
    if (file) {
      const uploadResponse = await homeworkService.uploadAttachment(file);
      if (uploadResponse.success) {
        attachment_url = uploadResponse.data;
      } else {
        toast.error('فشل رفع الملف المرفق');
        setUploading(false);
        return;
      }
    }

    const response = await homeworkService.createHomework({
      ...formData,
      due_date: new Date(formData.due_date).toISOString(),
      attachment_url
    });

    if (response.success) {
      toast.success('تم إضافة الواجب بنجاح');
      setIsDialogOpen(false);
      setFormData({ title: '', description: '', classroom_id: '', due_date: '' });
      setFile(null);
      loadData();
    } else {
      console.error(response.error);
      toast.error(response.error?.message || 'فشل إضافة الواجب');
    }
    setUploading(false);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!homeworkToEdit) return;

    const response = await homeworkService.updateHomework(homeworkToEdit.id, {
      title: formData.title,
      description: formData.description,
      classroom_id: formData.classroom_id,
      due_date: new Date(formData.due_date).toISOString()
    });

    if (response.success) {
      toast.success('تم تحديث الواجب بنجاح');
      setIsEditDialogOpen(false);
      setHomeworkToEdit(null);
      loadData();
    } else {
      console.error(response.error);
      toast.error(response.error?.message || 'فشل تحديث الواجب');
    }
  }

  async function handleDelete() {
    if (!homeworkToDelete) return;

    const response = await homeworkService.deleteHomework(homeworkToDelete.id);

    if (response.success) {
      toast.success('تم حذف الواجب بنجاح');
      setHomeworkToDelete(null);
      loadData();
    } else {
      console.error(response.error);
      toast.error(response.error?.message || 'فشل حذف الواجب');
    }
  }

  const openEditDialog = (hw: Homework) => {
    setHomeworkToEdit(hw);
    setFormData({
      title: hw.title,
      description: hw.description,
      classroom_id: hw.classroom_id,
      due_date: hw.due_date.slice(0, 16) // Format for datetime-local input
    });
    setIsEditDialogOpen(true);
  };

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
              <DialogDescription>
                أدخل تفاصيل الواجب الجديد أدناه.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>عنوان الواجب</Label>
                <Input
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="مثال: حل تمارين ص 50"
                />
              </div>

              <div className="space-y-2">
                <Label>الفصل الدراسي</Label>
                <Select onValueChange={val => setFormData({ ...formData, classroom_id: val })}>
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
                  onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>الوصف / التعليمات</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="تفاصيل الواجب..."
                />
              </div>

              <div className="space-y-2">
                <Label>مرفقات (اختياري)</Label>
                <Input
                  type="file"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? 'جاري الرفع...' : 'حفظ'}
              </Button>
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
            <Card key={hw.id} className="relative group">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg line-clamp-1">{hw.title}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">فتح القائمة</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(hw)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setHomeworkToDelete(hw)} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-sm text-muted-foreground">{hw.classroom?.name}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm line-clamp-2 text-muted-foreground min-h-[40px]">{hw.description}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/20 p-2 rounded">
                  <Calendar className="h-4 w-4" />
                  <span>تسليم: {format(new Date(hw.due_date), 'PPP', { locale: arEG })}</span>
                </div>
                {hw.attachment_url && (
                  <a href={hw.attachment_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    <BookCheck className="h-4 w-4" />
                    تحميل المرفق
                  </a>
                )}
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الواجب</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>عنوان الواجب</Label>
              <Input
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>الفصل الدراسي</Label>
              <Select
                value={formData.classroom_id}
                onValueChange={val => setFormData({ ...formData, classroom_id: val })}
              >
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
                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>الوصف / التعليمات</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <Button type="submit" className="w-full">حفظ التعديلات</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!homeworkToDelete} onOpenChange={(open) => !open && setHomeworkToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد تماماً؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الواجب <strong>{homeworkToDelete?.title}</strong> وجميع التسليمات المرتبطة به. لا يمكن التراجع عن هذا الإجراء.
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

      <HomeworkSubmissionsDialog
        open={!!gradingHomeworkId}
        onOpenChange={(open) => !open && setGradingHomeworkId(null)}
        homeworkId={gradingHomeworkId}
        homeworkTitle={gradingHomeworkTitle}
      />
    </div>
  );
}
