// src/pages/students/StudentsPage.tsx
// تحديث الصفحة لإضافة الحقول الجديدة وروابط التفاصيل
// Update page with new fields and link to details.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { studentService, StudentWithUser } from '@/services/studentService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Search, QrCode, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { StudentQuickView } from '@/components/students/StudentQuickView';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<StudentWithUser | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<StudentWithUser | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    grade: '',
    level: '',
    parent_name: '',
    parent_phone: '',
    address: ''
  });
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string, password: string, parentCode: string } | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    try {
      const response = await studentService.getStudents();
      if (response.success && response.data) {
        setStudents(response.data);
      } else {
        toast.error(response.error?.message || 'فشل تحميل قائمة الطلاب');
      }
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const response = await studentService.createStudent(formData);

      if (response.success && response.data) {
        toast.success('تم إضافة الطالب بنجاح');
        setIsDialogOpen(false);
        setCreatedCredentials({
          username: formData.username,
          password: response.data.password,
          parentCode: response.data.parentCode
        });
        setFormData({
          name: '', username: '', grade: '', level: '',
          parent_name: '', parent_phone: '', address: ''
        });
        loadStudents();
      } else {
        toast.error(response.error?.message || 'فشل إضافة الطالب');
      }
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ غير متوقع');
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!studentToEdit) return;

    try {
      const response = await studentService.updateStudent(studentToEdit.id, {
        name: formData.name,
        grade: formData.grade,
        level: formData.level,
        parent_name: formData.parent_name,
        parent_phone: formData.parent_phone,
        address: formData.address
      });

      if (response.success) {
        toast.success('تم تحديث بيانات الطالب بنجاح');
        setIsEditDialogOpen(false);
        setStudentToEdit(null);
        loadStudents();
      } else {
        toast.error(response.error?.message || 'فشل تحديث البيانات');
      }
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء التحديث');
    }
  }

  async function handleDelete() {
    if (!studentToDelete) return;
    try {
      const response = await studentService.deleteStudent(studentToDelete.id);
      if (response.success) {
        toast.success('تم حذف الطالب بنجاح');
        setStudentToDelete(null);
        loadStudents();
      } else {
        toast.error(response.error?.message || 'فشل حذف الطالب');
      }
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء الحذف');
    }
  }

  const openEditDialog = (student: StudentWithUser) => {
    setStudentToEdit(student);
    setFormData({
      name: student.user.name,
      username: student.user.username || '',
      grade: student.grade || '',
      level: student.level || '',
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      address: student.address || ''
    });
    setIsEditDialogOpen(true);
  };

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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>إضافة طالب جديد</DialogTitle>
                <DialogDescription>
                  أدخل بيانات الطالب الجديد لإنشاء حساب وملف شخصي له.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>اسم الطالب</Label>
                    <Input
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="مثال: محمد أحمد"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>اسم المستخدم (للدخول)</Label>
                    <Input
                      required
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                      placeholder="مثال: mohamed2024"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>المرحلة</Label>
                    <Select
                      value={formData.level}
                      onValueChange={(val) => setFormData({ ...formData, level: val, grade: '' })}
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
                      onValueChange={(val) => setFormData({ ...formData, grade: val })}
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

                <div className="border-t pt-4 mt-2">
                  <h4 className="text-sm font-medium mb-3 text-muted-foreground">بيانات ولي الأمر والاتصال</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم ولي الأمر</Label>
                      <Input
                        value={formData.parent_name}
                        onChange={e => setFormData({ ...formData, parent_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>رقم الهاتف</Label>
                      <Input
                        value={formData.parent_phone}
                        onChange={e => setFormData({ ...formData, parent_phone: e.target.value })}
                        placeholder="01xxxxxxxxx"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>العنوان</Label>
                      <Input
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full mt-4">حفظ</Button>
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
              <TableHead className="text-right">ولي الأمر</TableHead>
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
                  <TableCell>{student.parent_phone || '-'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">فتح القائمة</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                        <Link to={`/students/${student.id}`}>
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            عرض الملف
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem onClick={() => openEditDialog(student)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          تعديل البيانات
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setStudentToDelete(student)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          حذف الطالب
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعديل بيانات الطالب</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>اسم الطالب</Label>
              <Input
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المرحلة</Label>
                <Select
                  value={formData.level}
                  onValueChange={(val) => setFormData({ ...formData, level: val, grade: '' })}
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
                  onValueChange={(val) => setFormData({ ...formData, grade: val })}
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

            <div className="border-t pt-4 mt-2">
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">بيانات ولي الأمر والاتصال</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسم ولي الأمر</Label>
                  <Input
                    value={formData.parent_name}
                    onChange={e => setFormData({ ...formData, parent_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  <Input
                    value={formData.parent_phone}
                    onChange={e => setFormData({ ...formData, parent_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>العنوان</Label>
                  <Input
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full mt-4">حفظ التعديلات</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد تماماً؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الطالب <strong>{studentToDelete?.user.name}</strong> وجميع البيانات المرتبطة به (الدرجات، الحضور، المدفوعات) بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
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

      {/* Success Dialog */}
      <Dialog open={!!createdCredentials} onOpenChange={(open) => !open && setCreatedCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-green-600">تم إنشاء حساب الطالب بنجاح</DialogTitle>
            <DialogDescription>
              يرجى نسخ هذه البيانات وإعطائها للطالب وولي الأمر. لن تظهر كلمة المرور مرة أخرى.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4 bg-muted p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-2">
              <span className="font-semibold">اسم المستخدم:</span>
              <span className="font-mono">{createdCredentials?.username}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="font-semibold">كلمة المرور:</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border">{createdCredentials?.password}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="font-semibold">كود ولي الأمر:</span>
              <span className="font-mono text-blue-600 font-bold">{createdCredentials?.parentCode}</span>
            </div>
          </div>
          <Button onClick={() => setCreatedCredentials(null)} className="w-full mt-4">
            تم النسخ
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
