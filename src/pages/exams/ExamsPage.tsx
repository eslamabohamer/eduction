// src/pages/exams/ExamsPage.tsx
// صفحة قائمة الاختبارات
// Page listing all exams.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { examService, Exam } from '@/services/examService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Calendar, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { arEG } from 'date-fns/locale';
import { toast } from 'sonner';

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExams();
  }, []);

  async function loadExams() {
    try {
      const data = await examService.getExams();
      setExams(data as any);
    } catch (error) {
      console.error(error);
      toast.error('فشل تحميل الاختبارات');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">الاختبارات</h1>
        <Link to="/exams/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            إنشاء اختبار جديد
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p>جاري التحميل...</p>
        ) : exams.length === 0 ? (
          <div className="col-span-full text-center py-12 border rounded-lg bg-muted/10">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">لا توجد اختبارات</h3>
            <p className="text-muted-foreground mb-4">قم بإنشاء اختبارك الأول للطلاب</p>
            <Link to="/exams/create">
              <Button variant="outline">إنشاء اختبار</Button>
            </Link>
          </div>
        ) : (
          exams.map((exam) => (
            <Card key={exam.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-semibold line-clamp-1">{exam.title}</CardTitle>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    exam.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {exam.status === 'published' ? 'منشور' : 'مسودة'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{exam.classroom?.name}</p>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(exam.start_time), 'PPP', { locale: arEG })}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{exam.duration_minutes} دقيقة</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t mt-4">
                  <div className="text-xs text-muted-foreground">
                    {exam._count?.questions} سؤال • {exam.total_marks} درجة
                  </div>
                  <Button variant="ghost" size="sm" className="h-8">التفاصيل</Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
