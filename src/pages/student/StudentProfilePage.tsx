// src/pages/student/StudentProfilePage.tsx
// صفحة الملف الشخصي للطالب (عرض خاص للطالب)
// Student's own profile view with ID, grades, attendance, and finance.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { studentService, StudentWithUser } from '@/services/studentService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { StudentQRCode } from '@/components/secretary/StudentQRCode';
import { StudentAttendance } from '@/components/students/StudentAttendance';
import { StudentFinancials } from '@/components/students/StudentFinancials';
import { StudentAcademic } from '@/components/students/StudentAcademic';
import { StudentBehavior } from '@/components/students/StudentBehavior';
import { QrCode, User, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function StudentProfilePage() {
  const [student, setStudent] = useState<StudentWithUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyProfile();
  }, []);

  async function loadMyProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('student_profiles')
        .select(`
          *,
          user:users(*)
        `)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setStudent(data as StudentWithUser);
    } catch (error) {
      console.error(error);
      toast.error('فشل تحميل الملف الشخصي');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (!student) return null;

  return (
    <div className="space-y-6 pb-10">
      <h1 className="text-3xl font-bold tracking-tight">ملفي الشخصي</h1>

      {/* Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            <Avatar className="h-24 w-24 border-2 border-primary/10">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.user.name}`} />
              <AvatarFallback>{student.user.name[0]}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-2 text-center md:text-right w-full">
              <div className="flex flex-col md:flex-row justify-between items-center md:items-start">
                <div>
                  <h2 className="text-2xl font-bold">{student.user.name}</h2>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground mt-1">
                    <Badge variant="secondary" className="font-mono">{student.student_code}</Badge>
                    <span>• {student.level} - {student.grade}</span>
                  </div>
                </div>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="mt-4 md:mt-0 gap-2">
                      <QrCode className="h-4 w-4" />
                      بطاقتي المدرسية
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <StudentQRCode 
                      studentName={student.user.name} 
                      studentCode={student.student_code} 
                    />
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm bg-muted/20 p-4 rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>ولي الأمر: {student.parent_name || 'غير مسجل'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{student.address || 'العنوان غير مسجل'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="academic" className="w-full">
        <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 overflow-x-auto">
          <TabsTrigger value="academic" className="flex-1 min-w-[100px]">الأداء الأكاديمي</TabsTrigger>
          <TabsTrigger value="attendance" className="flex-1 min-w-[100px]">الحضور</TabsTrigger>
          <TabsTrigger value="financial" className="flex-1 min-w-[100px]">المالية</TabsTrigger>
          <TabsTrigger value="behavior" className="flex-1 min-w-[100px]">السلوك</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="academic">
            <StudentAcademic studentId={student.id} />
          </TabsContent>
          
          <TabsContent value="attendance">
            <StudentAttendance studentId={student.id} readOnly />
          </TabsContent>
          
          <TabsContent value="financial">
            <StudentFinancials studentId={student.id} readOnly />
          </TabsContent>
          
          <TabsContent value="behavior">
            <StudentBehavior studentId={student.id} readOnly />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
