// src/pages/Dashboard.tsx
// لوحة التحكم الرئيسية (محدثة للطلاب)
// Main dashboard showing overview based on user role.

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, GraduationCap, Video, BookCheck, Clock, User, ArrowLeft } from 'lucide-react';
import { studentService } from '@/services/studentService';
import { classroomService } from '@/services/classroomService';
import { examService } from '@/services/examService';
import { liveSessionService } from '@/services/liveSessionService';
import { homeworkService } from '@/services/homeworkService';
import { format } from 'date-fns';
import { arEG } from 'date-fns/locale';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<any[]>([]);

  useEffect(() => {
    if (user?.role === 'Teacher') {
      loadTeacherStats();
    } else if (user?.role === 'Student') {
      loadStudentStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  async function loadTeacherStats() {
    try {
      const [students, classrooms, exams, sessions] = await Promise.all([
        studentService.getStudents().then(res => res.length).catch(() => 0),
        classroomService.getClassrooms().then(res => res.length).catch(() => 0),
        examService.getExams().then(res => res.length).catch(() => 0),
        liveSessionService.getSessions().then(res => res.length).catch(() => 0)
      ]);

      setStats({ students, classrooms, exams, liveSessions: sessions });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStudentStats() {
    try {
      const [homeworks, exams, sessions] = await Promise.all([
        homeworkService.getStudentHomeworks(),
        examService.getExams(),
        liveSessionService.getSessions()
      ]);

      const pendingHomework = homeworks.filter(h => !h.submission).length;
      const upcomingExams = exams.filter(e => new Date(e.start_time) > new Date()).length;
      
      setStats({ pendingHomework, upcomingExams });
      
      // Combine upcoming events
      const events = [
        ...exams.map(e => ({ type: 'exam', title: e.title, date: e.start_time, link: '/my-exams' })),
        ...sessions.map(s => ({ type: 'live', title: s.title, date: s.start_time, link: '/my-live-sessions' })),
        ...homeworks.filter(h => !h.submission).map(h => ({ type: 'homework', title: h.title, date: h.due_date, link: '/my-homework' }))
      ]
      .filter(e => new Date(e.date) > new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);

      setUpcoming(events);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">مرحباً، {user?.name}</h2>
        <p className="text-muted-foreground">
          {user?.role === 'Student' ? 'نتمنى لك يوماً دراسياً موفقاً!' : 'إليك نظرة عامة على نشاطك التعليمي اليوم.'}
        </p>
      </div>

      {/* Teacher Stats */}
      {user?.role === 'Teacher' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الطلاب</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '-' : stats.students}</div>
              <p className="text-xs text-muted-foreground">طالب مسجل</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الفصول الدراسية</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '-' : stats.classrooms}</div>
              <p className="text-xs text-muted-foreground">فصل نشط</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الاختبارات</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '-' : stats.exams}</div>
              <p className="text-xs text-muted-foreground">اختبار تم إنشاؤه</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">البث المباشر</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '-' : stats.liveSessions}</div>
              <p className="text-xs text-muted-foreground">حصة افتراضية</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Student Dashboard */}
      {user?.role === 'Student' && (
        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">واجبات مطلوبة</CardTitle>
                  <BookCheck className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '-' : stats.pendingHomework}</div>
                  <p className="text-xs text-muted-foreground">بانتظار الحل</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">اختبارات قادمة</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '-' : stats.upcomingExams}</div>
                  <p className="text-xs text-muted-foreground">مجدولة قريباً</p>
                </CardContent>
              </Card>
              <Link to="/my-profile">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">ملفي الشخصي</CardTitle>
                    <User className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-medium mt-2">عرض التقارير والبطاقة</div>
                    <p className="text-xs text-muted-foreground">الحضور، الدرجات، المالية</p>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Quick Actions */}
            <h3 className="text-lg font-semibold">الوصول السريع</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to="/my-videos">
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:border-primary hover:text-primary bg-card">
                  <Video className="h-6 w-6" />
                  <span>الدروس المسجلة</span>
                </Button>
              </Link>
              <Link to="/my-live-sessions">
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:border-primary hover:text-primary bg-card">
                  <Video className="h-6 w-6 text-red-500" />
                  <span>حصص مباشرة</span>
                </Button>
              </Link>
              <Link to="/my-exams">
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:border-primary hover:text-primary bg-card">
                  <GraduationCap className="h-6 w-6" />
                  <span>الاختبارات</span>
                </Button>
              </Link>
              <Link to="/my-homework">
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:border-primary hover:text-primary bg-card">
                  <BookCheck className="h-6 w-6" />
                  <span>الواجبات</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Sidebar: Upcoming Schedule */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-lg">الجدول القادم</CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد أحداث قادمة</p>
              ) : (
                <div className="space-y-4">
                  {upcoming.map((event, i) => (
                    <Link key={i} to={event.link} className="block group">
                      <div className="flex gap-3 items-start p-2 rounded hover:bg-muted/50 transition-colors">
                        <div className={`w-1 h-10 rounded-full mt-1 ${
                          event.type === 'exam' ? 'bg-red-500' : 
                          event.type === 'live' ? 'bg-blue-500' : 'bg-green-500'
                        }`} />
                        <div>
                          <h4 className="font-medium text-sm group-hover:text-primary transition-colors">{event.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(event.date), 'EEEE, p', { locale: arEG })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              <Button variant="ghost" className="w-full mt-4 text-xs" asChild>
                <Link to="/calendar">عرض التقويم الكامل <ArrowLeft className="h-3 w-3 mr-1" /></Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
