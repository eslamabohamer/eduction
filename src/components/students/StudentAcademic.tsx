import { useEffect, useState } from 'react';
import { studentService } from '@/services/studentService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, BookOpen, AlertCircle } from 'lucide-react';

interface AcademicStats {
  exams: { name: string; score: number; total: number; percentage: number }[];
  homeworks: { name: string; score: number; total: number }[];
}

export function StudentAcademic({ studentId }: { studentId: string }) {
  const [stats, setStats] = useState<AcademicStats>({ exams: [], homeworks: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [studentId]);

  async function loadStats() {
    const response = await studentService.getAcademicStats(studentId);
    if (response.success && response.data) {
      setStats(response.data);
    } else {
      console.error(response.error);
    }
    setLoading(false);
  }

  // Calculations
  const averageExamScore = stats.exams.length > 0
    ? Math.round(stats.exams.reduce((acc, curr) => acc + curr.percentage, 0) / stats.exams.length)
    : 0;

  const completedHomeworks = stats.homeworks.length;
  const passedExams = stats.exams.filter(e => e.percentage >= 50).length;

  // Prepare chart data
  const chartData = [
    ...stats.exams.map(e => ({ name: e.name, score: e.percentage, type: 'اختبار' })),
    ...stats.homeworks.map(h => ({ name: h.name, score: (h.score / h.total) * 100, type: 'واجب' }))
  ].slice(-10); // Last 10 activities

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط الدرجات</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageExamScore}%</div>
            <p className="text-xs text-muted-foreground">بناءً على {stats.exams.length} اختبارات</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الواجبات المسلمة</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedHomeworks}</div>
            <p className="text-xs text-muted-foreground">واجب تم حله</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الاختبارات المجتازة</CardTitle>
            <AlertCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{passedExams}</div>
            <p className="text-xs text-muted-foreground">من أصل {stats.exams.length} اختبار</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الأداء الأكاديمي (آخر الأنشطة)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground bg-muted/10 rounded-lg border-dashed border">
              لا توجد بيانات كافية للعرض
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-45} textAnchor="end" height={60} />
                  <YAxis unit="%" />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>سجل الاختبارات</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.exams.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">لا توجد اختبارات</p>
            ) : (
              <div className="space-y-4">
                {stats.exams.map((exam, i) => (
                  <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{exam.name}</p>
                      <p className="text-xs text-muted-foreground">الدرجة النهائية: {exam.total}</p>
                    </div>
                    <div className={`text-sm font-bold ${exam.percentage >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                      {exam.score} ({exam.percentage}%)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>سجل الواجبات</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.homeworks.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">لا توجد واجبات</p>
            ) : (
              <div className="space-y-4">
                {stats.homeworks.map((hw, i) => (
                  <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{hw.name}</p>
                      <p className="text-xs text-muted-foreground">الدرجة النهائية: {hw.total}</p>
                    </div>
                    <div className="text-sm font-bold">
                      {hw.score} / {hw.total}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
