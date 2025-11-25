import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { studentDashboardService, DashboardStats, UpcomingEvent } from '@/services/studentDashboardService';
import { classroomService } from '@/services/classroomService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  Calendar, 
  Video, 
  FileText, 
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { arEG } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock data for the chart since we don't have historical data yet
const chartData = [
  { name: 'أسبوع 1', score: 65 },
  { name: 'أسبوع 2', score: 75 },
  { name: 'أسبوع 3', score: 72 },
  { name: 'أسبوع 4', score: 85 },
  { name: 'أسبوع 5', score: 82 },
  { name: 'أسبوع 6', score: 90 },
];

export function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentProfile, setStudentProfile] = useState<any>(null);

  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return;
      
      try {
        // 1. Get Student Profile to get ID and Classroom
        // Note: In a real app, we might store this in context or a hook
        const { data: profile } = await classroomService['supabase']
          .from('student_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (profile) {
          setStudentProfile(profile);
          
          // 2. Get Stats
          const statsData = await studentDashboardService.getStats(profile.id);
          setStats(statsData);

          // 3. Get Schedule (Need to find classroom first)
          const { data: enrollment } = await classroomService['supabase']
            .from('enrollments')
            .select('classroom_id')
            .eq('student_id', profile.id)
            .single();

          if (enrollment) {
            const schedule = await studentDashboardService.getUpcomingSchedule(enrollment.classroom_id);
            setUpcomingEvents(schedule);
          }
        }
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  if (loading) return <div className="p-8 text-center">جاري تحميل لوحة التحكم...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary">
            <AvatarImage src={studentProfile?.avatar_url} />
            <AvatarFallback className="text-lg">{user?.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">مرحباً، {user?.name} 👋</h1>
            <p className="text-muted-foreground">
              {studentProfile?.level} - {studentProfile?.grade}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/my-homework')} variant="outline">
            الواجبات
          </Button>
          <Button onClick={() => navigate('/my-exams')}>
            الاختبارات
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الواجبات المكتملة</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedAssignments}</div>
            <p className="text-xs text-muted-foreground">من إجمالي الواجبات</p>
            <Progress value={75} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الواجبات المعلقة</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingAssignments}</div>
            <p className="text-xs text-muted-foreground">تحتاج إلى تسليم</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط الدرجات</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.averageGrade} / 10</div>
            <p className="text-xs text-muted-foreground">مستوى الأداء العام</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">حضور البث المباشر</CardTitle>
            <Video className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.attendanceRate}</div>
            <p className="text-xs text-muted-foreground">حصة تم حضورها</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Main Content Area (Chart + Upcoming) */}
        <div className="md:col-span-4 space-y-6">
          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>تقدم المستوى الدراسي</CardTitle>
              <CardDescription>تحليل درجاتك خلال الأسابيع الماضية</CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                    <YAxis tick={{fontSize: 12}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#colorScore)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                الجدول القادم (7 أيام)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد أحداث قادمة قريباً
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div 
                      key={event.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          event.type === 'exam' ? 'bg-red-100 text-red-600' :
                          event.type === 'live_session' ? 'bg-purple-100 text-purple-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {event.type === 'exam' && <AlertCircle className="h-5 w-5" />}
                          {event.type === 'live_session' && <Video className="h-5 w-5" />}
                          {event.type === 'homework' && <FileText className="h-5 w-5" />}
                        </div>
                        <div>
                          <h4 className="font-semibold">{event.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {event.courseName} • {format(new Date(event.date), 'EEEE d MMMM, p', { locale: arEG })}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => {
                        if (event.type === 'exam') navigate('/my-exams');
                        if (event.type === 'live_session') navigate('/my-live-sessions');
                        if (event.type === 'homework') navigate('/my-homework');
                      }}>
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Area (Notifications + Quick Actions) */}
        <div className="md:col-span-3 space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle>إجراءات سريعة</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button className="w-full justify-start gap-2" onClick={() => navigate('/my-live-sessions')}>
                <Video className="h-4 w-4" />
                الانضمام للحصة المباشرة
              </Button>
              <Button variant="secondary" className="w-full justify-start gap-2" onClick={() => navigate('/my-homework')}>
                <FileText className="h-4 w-4" />
                رفع واجب مدرسي
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/profile')}>
                <User className="h-4 w-4" />
                تعديل الملف الشخصي
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>آخر الإشعارات</CardTitle>
            </CardHeader>
            <CardContent>
              {/* This would typically be fetched from notificationService */}
              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="h-2 w-2 mt-2 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">تم تصحيح واجب الفيزياء</p>
                    <p className="text-xs text-muted-foreground">منذ ساعتين</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="h-2 w-2 mt-2 rounded-full bg-green-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">موعد اختبار الرياضيات غداً</p>
                    <p className="text-xs text-muted-foreground">منذ 5 ساعات</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="h-2 w-2 mt-2 rounded-full bg-gray-300 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">تم إضافة درس فيديو جديد</p>
                    <p className="text-xs text-muted-foreground">أمس</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function User(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
