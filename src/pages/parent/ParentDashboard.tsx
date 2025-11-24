// src/pages/parent/ParentDashboard.tsx
// لوحة تحكم ولي الأمر
// Main dashboard for Parents showing their children.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { parentService } from '@/services/parentService';
import { StudentWithUser } from '@/services/studentService';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Activity, DollarSign, CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function ParentDashboard() {
  const [children, setChildren] = useState<(StudentWithUser & { stats?: any })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChildren();
  }, []);

  async function loadChildren() {
    try {
      const students = await parentService.getMyChildren();
      
      // Load stats for each child
      const studentsWithStats = await Promise.all(
        students.map(async (student) => {
          const stats = await parentService.getChildStats(student.id);
          return { ...student, stats };
        })
      );

      setChildren(studentsWithStats);
    } catch (error) {
      console.error(error);
      toast.error('فشل تحميل بيانات الأبناء');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-10 text-center">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">مرحباً بك، ولي الأمر</h1>
        <p className="text-muted-foreground">تابع تقدم أبنائك الدراسي والمالي من مكان واحد</p>
      </div>

      {children.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/10">
          <h3 className="text-lg font-medium">لا يوجد أبناء مرتبطين بالحساب</h3>
          <p className="text-muted-foreground">يرجى التواصل مع إدارة المدرسة لربط حسابك بملفات الطلاب.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <Card key={child.id} className="overflow-hidden hover:shadow-lg transition-shadow border-t-4 border-t-primary">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Avatar className="h-14 w-14 border-2 border-white shadow-sm">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${child.user.name}`} />
                  <AvatarFallback>{child.user.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{child.user.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs font-normal">
                      {child.level} - {child.grade}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="grid grid-cols-3 gap-2 py-4 text-center text-sm border-y bg-muted/5">
                <div className="space-y-1">
                  <div className="flex justify-center text-primary">
                    <CalendarCheck className="h-5 w-5" />
                  </div>
                  <div className="font-bold">{child.stats?.attendanceRate}%</div>
                  <div className="text-xs text-muted-foreground">الحضور</div>
                </div>
                <div className="space-y-1 border-x border-dashed">
                  <div className="flex justify-center text-blue-600">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div className="font-bold">{child.stats?.avgScore || '-'}</div>
                  <div className="text-xs text-muted-foreground">الأداء</div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-center text-green-600">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div className={`font-bold ${child.stats?.dueBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {child.stats?.dueBalance > 0 ? 'مستحق' : 'خالص'}
                  </div>
                  <div className="text-xs text-muted-foreground">المالية</div>
                </div>
              </CardContent>

              <CardFooter className="pt-4">
                <Link to={`/parent/child/${child.id}`} className="w-full">
                  <Button className="w-full gap-2">
                    عرض التفاصيل
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
