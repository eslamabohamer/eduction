import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    BookOpen,
    Clock,
    GraduationCap,
    Video,
    FileText,
    Bell,
    CheckCircle2,
    AlertCircle,
    Radio
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function StudentDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Mock data - replace with real data fetching later
    const stats = {
        attendance: 95,
        upcomingExams: 2,
        newLessons: 3,
        nextClass: {
            subject: 'الرياضيات',
            time: '10:00 AM',
            teacher: 'أ. محمد'
        }
    };

    return (
        <div className="space-y-6 p-6 pb-20 md:pb-6">
            {/* Welcome Section */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">مرحباً، {user?.name} 👋</h1>
                    <p className="text-muted-foreground">
                        نتمنى لك يوماً دراسياً موفقاً! إليك نظرة عامة على تقدمك.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="relative">
                        <Bell className="h-5 w-5" />
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                            3
                        </span>
                    </Button>
                    <div className="text-sm text-muted-foreground">
                        {format(new Date(), 'EEEE، d MMMM yyyy', { locale: ar })}
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">نسبة الحضور</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.attendance}%</div>
                        <p className="text-xs text-muted-foreground">ممتاز، حافظ على هذا المستوى!</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">الامتحانات القادمة</CardTitle>
                        <FileText className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.upcomingExams}</div>
                        <p className="text-xs text-muted-foreground">استعد جيداً للاختبارات القادمة</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">الدروس الجديدة</CardTitle>
                        <Video className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.newLessons}</div>
                        <p className="text-xs text-muted-foreground">دروس فيديو جديدة بانتظارك</p>
                    </CardContent>
                </Card>
                <Card className="bg-primary text-primary-foreground">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-primary-foreground/90">
                            الحصة القادمة
                        </CardTitle>
                        <Clock className="h-4 w-4 text-primary-foreground/90" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.nextClass.time}</div>
                        <p className="text-sm font-medium opacity-90">
                            {stats.nextClass.subject} • {stats.nextClass.teacher}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Actions Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Quick Links */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>روابط سريعة</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Button
                            variant="outline"
                            className="h-24 flex-col gap-2 border-2 hover:border-primary/50 hover:bg-primary/5"
                            onClick={() => navigate('/my-exams')}
                        >
                            <FileText className="h-8 w-8 text-orange-500" />
                            <span>الامتحانات</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-24 flex-col gap-2 border-2 hover:border-primary/50 hover:bg-primary/5"
                            onClick={() => navigate('/my-videos')}
                        >
                            <Video className="h-8 w-8 text-blue-500" />
                            <span>الدروس المسجلة</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-24 flex-col gap-2 border-2 hover:border-primary/50 hover:bg-primary/5"
                            onClick={() => navigate('/my-live-sessions')}
                        >
                            <Radio className="h-8 w-8 text-red-500" />
                            <span>البث المباشر</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-24 flex-col gap-2 border-2 hover:border-primary/50 hover:bg-primary/5"
                            onClick={() => navigate('/my-homework')}
                        >
                            <BookOpen className="h-8 w-8 text-green-500" />
                            <span>الواجبات</span>
                        </Button>
                    </CardContent>
                </Card>

                {/* Recent Activity / Notifications */}
                <Card>
                    <CardHeader>
                        <CardTitle>آخر التنبيهات</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { title: 'تم نشر واجب جديد في الرياضيات', time: 'منذ ساعة', icon: BookOpen, color: 'text-blue-500' },
                                { title: 'تذكير: امتحان الفيزياء غداً', time: 'منذ ساعتين', icon: AlertCircle, color: 'text-orange-500' },
                                { title: 'تم رصد درجة اختبار الكيمياء', time: 'منذ يوم', icon: GraduationCap, color: 'text-green-500' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
                                    <div className={`mt-1 rounded-full bg-muted p-1.5 ${item.color}`}>
                                        <item.icon className="h-4 w-4" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">{item.title}</p>
                                        <p className="text-xs text-muted-foreground">{item.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
