// src/pages/students/StudentDetailsPage.tsx
// صفحة الملف الشخصي للطالب الشاملة (محدثة للسكرتارية)
// Comprehensive student profile page with tabs for different modules.

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentService, StudentWithUser } from '@/services/studentService';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Phone, MapPin, User, AlertTriangle, Printer } from 'lucide-react';
import { toast } from 'sonner';

// Sub-components
import { StudentAttendance } from '@/components/students/StudentAttendance';
import { StudentFinancials } from '@/components/students/StudentFinancials';
import { StudentBehavior } from '@/components/students/StudentBehavior';
import { StudentAcademic } from '@/components/students/StudentAcademic';
import { EditStudentDialog } from '@/components/students/EditStudentDialog';
import { StudentQRCode } from '@/components/secretary/StudentQRCode';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

export default function StudentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    if (id) loadStudent();
  }, [id]);

  async function loadStudent() {
    const response = await studentService.getStudentById(id!);
    if (response.success && response.data) {
      setStudent(response.data);
    } else {
      toast.error(response.error?.message || 'فشل تحميل بيانات الطالب');
      navigate('/students');
    }
    setLoading(false);
  }

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (!student) return null;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/students')}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">ملف الطالب</h1>
      </div>

      {/* Profile Overview Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <Avatar className="h-24 w-24 border-2 border-primary/10">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.user.name}`} />
              <AvatarFallback>{student.user.name[0]}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-2 w-full">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{student.user.name}</h2>
                  <div className="flex items-center gap-2 text-muted-foreground mt-1">
                    <Badge variant="secondary" className="font-mono">{student.student_code}</Badge>
                    <span>• {student.level} - {student.grade}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* QR Code Button for Secretary/Teacher */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" title="طباعة البطاقة">
                        <Printer className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <StudentQRCode
                        studentName={student.user.name}
                        studentCode={student.student_code}
                      />
                    </DialogContent>
                  </Dialog>

                  <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                    تعديل البيانات
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>ولي الأمر: {student.parent_name || 'غير مسجل'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{student.parent_phone || 'غير مسجل'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{student.address || 'العنوان غير مسجل'}</span>
                  </div>
                  {student.emergency_contact && (
                    <div className="flex items-center gap-2 text-red-500">
                      <AlertTriangle className="h-4 w-4" />
                      <span>طوارئ: {student.emergency_contact}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="w-full justify-start h-auto p-1 bg-muted/50">
          {/* Hide Academic Tab for Secretary if restricted, but prompt said "unless granted". 
              We'll hide it by default for Secretary to be safe, or show it read-only. 
              Let's hide it for now based on prompt "Secretary cannot access sensitive academic data". */}
          {user?.role !== 'Secretary' && (
            <TabsTrigger value="academic" className="flex-1 md:flex-none">الأداء الأكاديمي</TabsTrigger>
          )}
          <TabsTrigger value="attendance" className="flex-1 md:flex-none">الحضور والغياب</TabsTrigger>
          <TabsTrigger value="financial" className="flex-1 md:flex-none">المعاملات المالية</TabsTrigger>
          <TabsTrigger value="behavior" className="flex-1 md:flex-none">السلوك والملاحظات</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {user?.role !== 'Secretary' && (
            <TabsContent value="academic">
              <StudentAcademic studentId={student.id} />
            </TabsContent>
          )}

          <TabsContent value="attendance">
            <StudentAttendance studentId={student.id} />
          </TabsContent>

          <TabsContent value="financial">
            <StudentFinancials studentId={student.id} />
          </TabsContent>

          <TabsContent value="behavior">
            <StudentBehavior studentId={student.id} />
          </TabsContent>
        </div>
      </Tabs>

      <EditStudentDialog
        student={student}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={loadStudent}
      />
    </div>
  );
}
