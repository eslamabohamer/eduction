// src/pages/classrooms/ClassroomsPage.tsx
// تحديث الصفحة للانتقال إلى التفاصيل عند النقر
// Update page to navigate to details on click.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { classroomService, Classroom } from '@/services/classroomService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Users, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
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

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [classroomToEdit, setClassroomToEdit] = useState<Classroom | null>(null);
  const [classroomToDelete, setClassroomToDelete] = useState<Classroom | null>(null);
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
    setLoading(true);
    const response = await classroomService.getClassrooms();
    if (response.success && response.data) {
      setClassrooms(response.data);
    } else {
      console.error(response.error);
      toast.error('فشل تحميل الفصول');
    }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const response = await classroomService.createClassroom(formData);

    if (response.success) {
      toast.success('تم إنشاء الفصل بنجاح');
      setIsDialogOpen(false);
      setFormData({ name: '', level: '', grade: '' });
      loadClassrooms();
    } else {
      console.error(response.error);
      toast.error(response.error?.message || 'فشل إنشاء الفصل');
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!classroomToEdit) return;

    const response = await classroomService.updateClassroom(classroomToEdit.id, formData);

    if (response.success) {
      toast.success('تم تحديث الفصل بنجاح');
      setIsEditDialogOpen(false);
      setClassroomToEdit(null);
      loadClassrooms();
    } else {
      console.error(response.error);
      toast.error(response.error?.message || 'فشل تحديث الفصل');
    }
  }

  async function handleDelete() {
    if (!classroomToDelete) return;

    const response = await classroomService.deleteClassroom(classroomToDelete.id);

    if (response.success) {
      toast.success('تم حذف الفصل بنجاح');
      setClassroomToDelete(null);
      loadClassrooms();
    } else {
      console.error(response.error);
      toast.error(response.error?.message || 'فشل حذف الفصل');
    }
  }

  const openEditDialog = (classroom: Classroom) => {
    setClassroomToEdit(classroom);
    setFormData({
      name: classroom.name,
      level: classroom.level,
      grade: classroom.grade
    });
    setIsEditDialogOpen(true);
  };

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
              <DialogDescription>
                أدخل تفاصيل الفصل الجديد أدناه.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>اسم الفصل / المجموعة</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: مجموعة أ - فيزياء"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>المرحلة</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, level: value, grade: '' }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المرحلة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ابتدائي">ابتدائي</SelectItem>
                      <SelectItem value="اعدادي">اعدادي</SelectItem>
                      <SelectItem value="ثانوي">ثانوي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الصف</Label>
                  <Select
                    value={formData.grade}
                    onValueChange={(value) => setFormData({ ...formData, grade: value })}
                    disabled={!formData.level}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الصف" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.level === 'ابتدائي' ? (
                        <>
                          <SelectItem value="الصف الأول">الصف الأول</SelectItem>
                          <SelectItem value="الصف الثاني">الصف الثاني</SelectItem>
                          <SelectItem value="الصف الثالث">الصف الثالث</SelectItem>
                          <SelectItem value="الصف الرابع">الصف الرابع</SelectItem>
                          <SelectItem value="الصف الخامس">الصف الخامس</SelectItem>
                          <SelectItem value="الصف السادس">الصف السادس</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="الصف الأول">الصف الأول</SelectItem>
                          <SelectItem value="الصف الثاني">الصف الثاني</SelectItem>
                          <SelectItem value="الصف الثالث">الصف الثالث</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
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
              className="hover:bg-muted/50 transition-colors relative group"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold cursor-pointer" onClick={() => navigate(`/classrooms/${classroom.id}`)}>
                  {classroom.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">فتح القائمة</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(classroom)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setClassroomToDelete(classroom)} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="cursor-pointer" onClick={() => navigate(`/classrooms/${classroom.id}`)}>
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الفصل</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>اسم الفصل / المجموعة</Label>
              <Input
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المرحلة</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, level: value, grade: '' }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المرحلة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ابتدائي">ابتدائي</SelectItem>
                    <SelectItem value="اعدادي">اعدادي</SelectItem>
                    <SelectItem value="ثانوي">ثانوي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الصف</Label>
                <Select
                  value={formData.grade}
                  onValueChange={(value) => setFormData({ ...formData, grade: value })}
                  disabled={!formData.level}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الصف" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.level === 'ابتدائي' ? (
                      <>
                        <SelectItem value="الصف الأول">الصف الأول</SelectItem>
                        <SelectItem value="الصف الثاني">الصف الثاني</SelectItem>
                        <SelectItem value="الصف الثالث">الصف الثالث</SelectItem>
                        <SelectItem value="الصف الرابع">الصف الرابع</SelectItem>
                        <SelectItem value="الصف الخامس">الصف الخامس</SelectItem>
                        <SelectItem value="الصف السادس">الصف السادس</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="الصف الأول">الصف الأول</SelectItem>
                        <SelectItem value="الصف الثاني">الصف الثاني</SelectItem>
                        <SelectItem value="الصف الثالث">الصف الثالث</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full">حفظ التعديلات</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!classroomToDelete} onOpenChange={(open) => !open && setClassroomToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد تماماً؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الفصل <strong>{classroomToDelete?.name}</strong>. سيؤدي هذا أيضاً إلى حذف جميع التسجيلات المرتبطة به.
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
