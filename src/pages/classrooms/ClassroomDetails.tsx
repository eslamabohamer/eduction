// src/pages/classrooms/ClassroomDetails.tsx
// صفحة تفاصيل الفصل وإدارة الطلاب المسجلين
// Page for viewing classroom details and managing enrolled students.

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { classroomService, Classroom } from '@/services/classroomService';
import { studentService, StudentWithUser } from '@/services/studentService';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowRight, Plus, Trash2, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ClassroomDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<StudentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Enrollment state
  const [allStudents, setAllStudents] = useState<StudentWithUser[]>([]);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [cls, enrolled, all] = await Promise.all([
        classroomService.getClassroomById(id!),
        classroomService.getEnrolledStudents(id!),
        studentService.getStudents()
      ]);
      setClassroom(cls);
      setEnrolledStudents(enrolled);
      setAllStudents(all);
    } catch (error) {
      console.error(error);
      toast.error('فشل تحميل بيانات الفصل');
      navigate('/classrooms');
    } finally {
      setLoading(false);
    }
  }

  async function handleEnroll() {
    if (!selectedStudentId || !id) return;
    try {
      await classroomService.enrollStudent(id, selectedStudentId);
      toast.success('تم تسجيل الطالب بنجاح');
      setOpenCombobox(false);
      setSelectedStudentId('');
      loadData(); // Reload list
    } catch (error) {
      console.error(error);
      toast.error('فشل تسجيل الطالب');
    }
  }

  async function handleRemoveStudent(studentId: string) {
    if (!confirm('هل أنت متأكد من إزالة الطالب من هذا الفصل؟')) return;
    try {
      await classroomService.removeStudent(id!, studentId);
      toast.success('تم إزالة الطالب');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('فشل إزالة الطالب');
    }
  }

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (!classroom) return null;

  // Filter out already enrolled students from the dropdown
  const availableStudents = allStudents.filter(
    s => !enrolledStudents.some(es => es.id === s.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/classrooms')}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{classroom.name}</h1>
          <p className="text-muted-foreground">
            {classroom.level} - {classroom.grade} • {enrolledStudents.length} طالب
          </p>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border">
        <h2 className="text-lg font-semibold">الطلاب المسجلين</h2>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة طالب للفصل
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>تسجيل طالب في الفصل</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between"
                  >
                    {selectedStudentId
                      ? allStudents.find((s) => s.id === selectedStudentId)?.user.name
                      : "اختر طالباً..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="بحث عن طالب..." />
                    <CommandList>
                      <CommandEmpty>لا يوجد طلاب متاحين.</CommandEmpty>
                      <CommandGroup>
                        {availableStudents.map((student) => (
                          <CommandItem
                            key={student.id}
                            value={student.user.name}
                            onSelect={() => {
                              setSelectedStudentId(student.id);
                              setOpenCombobox(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedStudentId === student.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {student.user.name} ({student.student_code})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              <Button 
                className="w-full" 
                onClick={handleEnroll}
                disabled={!selectedStudentId}
              >
                تأكيد الإضافة
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Students Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">الكود</TableHead>
              <TableHead className="text-right">تاريخ الإضافة</TableHead>
              <TableHead className="text-right w-[100px]">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrolledStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  لا يوجد طلاب مسجلين في هذا الفصل بعد.
                </TableCell>
              </TableRow>
            ) : (
              enrolledStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.user.name}</TableCell>
                  <TableCell className="font-mono">{student.student_code}</TableCell>
                  <TableCell>{new Date(student.user.created_at).toLocaleDateString('ar-EG')}</TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveStudent(student.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
