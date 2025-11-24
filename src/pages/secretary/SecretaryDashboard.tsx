// src/pages/secretary/SecretaryDashboard.tsx
// لوحة تحكم السكرتارية
// Main dashboard for Secretary role.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, CalendarCheck, DollarSign, MessageSquare, QrCode, UserPlus } from 'lucide-react';
import { studentService } from '@/services/studentService';
import { classroomService } from '@/services/classroomService';

export default function SecretaryDashboard() {
  const [stats, setStats] = useState({
    students: 0,
    classrooms: 0,
    attendanceToday: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const [studentsResponse, classroomsResponse] = await Promise.all([
        studentService.getStudents(),
        classroomService.getClassrooms()
      ]);
      setStats({
        students: studentsResponse.success && studentsResponse.data ? studentsResponse.data.length : 0,
        classrooms: classroomsResponse.success && classroomsResponse.data ? classroomsResponse.data.length : 0,
        attendanceToday: 0 // Would need a specific query for today's attendance
      });
    } catch (error) {
      console.error('Failed to load secretary stats', error);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">لوحة السكرتارية</h1>
        <p className="text-muted-foreground">إدارة شؤون الطلاب والعمليات الإدارية</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/students">
          <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:border-primary hover:text-primary">
            <UserPlus className="h-6 w-6" />
            <span>تسجيل طالب</span>
          </Button>
        </Link>
        <Link to="/secretary/notifications">
          <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:border-primary hover:text-primary">
            <MessageSquare className="h-6 w-6" />
            <span>إرسال تنبيهات</span>
          </Button>
        </Link>
        <Link to="/calendar">
          <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:border-primary hover:text-primary">
            <CalendarCheck className="h-6 w-6" />
            <span>الجدول الدراسي</span>
          </Button>
        </Link>
        <Link to="/finance">
          <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:border-primary hover:text-primary">
            <DollarSign className="h-6 w-6" />
            <span>المدفوعات</span>
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلاب</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.students}</div>
            <p className="text-xs text-muted-foreground">طالب مسجل في النظام</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الفصول الدراسية</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.classrooms}</div>
            <p className="text-xs text-muted-foreground">مجموعة دراسية نشطة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الحضور اليوم</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">طالب حضر اليوم</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
