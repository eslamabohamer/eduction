// src/pages/student/StudentExamsPage.tsx
// صفحة عرض الاختبارات للطالب
// Page for students to view their available exams.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { examService, Exam } from '@/services/examService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { format, isPast, isFuture } from 'date-fns';
import { arEG } from 'date-fns/locale';

export default function StudentExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reuse the same service, RLS filters for us automatically
    examService.getExams().then(data => {
      setExams(data as any);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">اختباراتي</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p>جاري التحميل...</p>
        ) : exams.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-10">لا توجد اختبارات متاحة حالياً</p>
        ) : (
          exams.map((exam) => {
            const isExpired = isPast(new Date(exam.end_time));
            const isUpcoming = isFuture(new Date(exam.start_time));
            const isActive = !isExpired && !isUpcoming;

            return (
              <Card key={exam.id} className={isExpired ? 'opacity-75 bg-muted/30' : ''}>
                <CardHeader>
                  <CardTitle className="text-lg">{exam.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{exam.classroom?.name}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(exam.start_time), 'PPP p', { locale: arEG })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{exam.duration_minutes} دقيقة</span>
                  </div>
                  
                  {isExpired && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>انتهى موعد الاختبار</span>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  {isActive ? (
                    <Link to={`/exams/${exam.id}/take`} className="w-full">
                      <Button className="w-full">بدء الاختبار</Button>
                    </Link>
                  ) : isUpcoming ? (
                    <Button disabled className="w-full" variant="outline">لم يبدأ بعد</Button>
                  ) : (
                    <Button disabled className="w-full" variant="secondary">منتهي</Button>
                  )}
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
