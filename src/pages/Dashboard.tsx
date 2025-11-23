// src/pages/Dashboard.tsx
// لوحة التحكم الرئيسية
// Main dashboard showing overview based on user role.

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, GraduationCap, Video, BookCheck } from 'lucide-react';
import { studentService } from '@/services/studentService';
import { classroomService } from '@/services/classroomService';
import { examService } from '@/services/examService';
import { liveSessionService } from '@/services/liveSessionService';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    students: 0,
    classrooms: 0,
    exams: 0,
    liveSessions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'Teacher') {
      loadStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  async function loadStats() {
    try {
      // Parallel fetch for performance
      const [students, classrooms, exams, sessions] = await Promise.all([
        studentService.getStudents().then(res => res.length).catch(() => 0),
        classroomService.getClassrooms().then(res => res.length).catch(() => 0),
        examService.getExams().then(res => res.length).catch(() => 0),
        liveSessionService.getSessions().then(res => res.length).catch(() => 0)
      ]);

      setStats({
        students,
        classrooms,
        exams,
        liveSessions: sessions
      });
    } catch (error) {
      console.error('Failed to load dashboard stats', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">مرحباً، {user?.name}</h2>
        <p className="text-muted-foreground">
          إليك نظرة عامة على نشاطك التعليمي اليوم.
        </p>
      </div>

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

      {user?.role === 'Student' && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">واجباتي</CardTitle>
              <BookCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">واجب بانتظار الحل</p>
            </CardContent>
          </Card>
          {/* Add more student stats here if needed */}
        </div>
      )}
    </div>
  );
}
