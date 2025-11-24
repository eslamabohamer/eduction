import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentService, StudentWithUser } from '@/services/studentService';
import { parentService } from '@/services/parentService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Calendar,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { arEG } from 'date-fns/locale';

export default function ParentChildDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [behavior, setBehavior] = useState<any[]>([]);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  async function loadData(studentId: string) {
    try {
      const [studentData, statsData, attendanceData, behaviorData] = await Promise.all([
        studentService.getStudentById(studentId),
        studentService.getAcademicStats(studentId),
        studentService.getAttendance(studentId),
        studentService.getBehaviorNotes(studentId)
      ]);

      setStudent(studentData);
      setStats(statsData);
      setAttendance(attendanceData);
      setBehavior(behaviorData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-10 text-center">جاري التحميل...</div>;
  if (!student) return <div className="p-10 text-center">لم يتم العثور على الطالب</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/parent/dashboard')}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/20">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.user.name}`} />
            <AvatarFallback>{student.user.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{student.user.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Badge variant="outline">{student.level} - {student.grade}</Badge>
              <span>•</span>
              <span>كود الطالب: {student.student_code}</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="academic" className="space-y-4">
        <TabsList className="w-full justify-start h-auto p-1 bg-muted/50">
          <TabsTrigger value="academic" className="flex-1 md:flex-none">الأداء الأكاديمي</TabsTrigger>
          <TabsTrigger value="attendance" className="flex-1 md:flex-none">الحضور والغياب</TabsTrigger>
          <TabsTrigger value="behavior" className="flex-1 md:flex-none">السلوك والملاحظات</TabsTrigger>
        </TabsList>

        {/* Academic Tab */}
        <TabsContent value="academic" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">متوسط الدرجات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.exams.length > 0
                    ? Math.round(stats.exams.reduce((a: any, b: any) => a + b.percentage, 0) / stats.exams.length)
                    : 0}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">الامتحانات المكتملة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.exams.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">الواجبات المسلمة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.homeworks.length || 0}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>نتائج الامتحانات الأخيرة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.exams.map((exam: any, i: number) => (
                  <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{exam.name}</p>
                      <p className="text-sm text-muted-foreground">
                        الدرجة: {exam.score} / {exam.total}
                      </p>
                    </div>
                    <Badge variant={exam.percentage >= 50 ? 'default' : 'destructive'}>
                      {exam.percentage}%
                    </Badge>
                  </div>
                ))}
                {stats?.exams.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">لا توجد نتائج امتحانات</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-green-50 border-green-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-700">حضور</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-800">
                  {attendance.filter(r => r.status === 'present').length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-700">غياب</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-800">
                  {attendance.filter(r => r.status === 'absent').length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50 border-yellow-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-700">تأخير</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-800">
                  {attendance.filter(r => r.status === 'late').length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>سجل الحضور اليومي</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {attendance.map((record, i) => (
                  <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${record.status === 'present' ? 'bg-green-100 text-green-600' :
                          record.status === 'absent' ? 'bg-red-100 text-red-600' :
                            'bg-yellow-100 text-yellow-600'
                        }`}>
                        {record.status === 'present' ? <CheckCircle2 className="h-4 w-4" /> :
                          record.status === 'absent' ? <XCircle className="h-4 w-4" /> :
                            <Clock className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium">
                          {format(new Date(record.date), 'EEEE, d MMMM yyyy', { locale: arEG })}
                        </p>
                        {record.notes && (
                          <p className="text-sm text-muted-foreground">{record.notes}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {record.status === 'present' ? 'حاضر' :
                        record.status === 'absent' ? 'غائب' : 'متأخر'}
                    </Badge>
                  </div>
                ))}
                {attendance.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">لا يوجد سجل حضور</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Behavior Tab */}
        <TabsContent value="behavior" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ملاحظات السلوك</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {behavior.map((note, i) => (
                  <div key={i} className={`p-4 rounded-lg border ${note.type === 'positive' ? 'bg-green-50 border-green-100' :
                      note.type === 'negative' ? 'bg-red-50 border-red-100' :
                        'bg-gray-50 border-gray-100'
                    }`}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{note.title}</h4>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.created_at), 'PPP', { locale: arEG })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{note.description}</p>
                  </div>
                ))}
                {behavior.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">لا توجد ملاحظات سلوكية</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
