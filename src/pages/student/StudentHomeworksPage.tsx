// src/pages/student/StudentHomeworksPage.tsx
// صفحة واجبات الطالب
// Student view for homework assignments.

import { useEffect, useState } from 'react';
import { homeworkService, Homework } from '@/services/homeworkService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, FileText } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { arEG } from 'date-fns/locale';
import { toast } from 'sonner';

export default function StudentHomeworksPage() {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const data = await homeworkService.getStudentHomeworks();
      setHomeworks(data);
    } catch (error) {
      console.error(error);
      toast.error('فشل تحميل الواجبات');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(homeworkId: string) {
    if (!answer.trim()) return;
    
    setSubmittingId(homeworkId);
    try {
      await homeworkService.submitHomework(homeworkId, answer);
      toast.success('تم تسليم الواجب بنجاح');
      setIsDialogOpen(false);
      setAnswer('');
      loadData(); // Reload to update status
    } catch (error) {
      console.error(error);
      toast.error('فشل تسليم الواجب');
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">واجباتي المدرسية</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p>جاري التحميل...</p>
        ) : homeworks.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-10">لا توجد واجبات مطلوبة حالياً</p>
        ) : (
          homeworks.map((hw) => {
            const isSubmitted = !!hw.submission;
            const isExpired = !isSubmitted && isPast(new Date(hw.due_date));

            return (
              <Card key={hw.id} className={isSubmitted ? 'bg-muted/20' : ''}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{hw.title}</CardTitle>
                    {isSubmitted ? (
                      <Badge variant="default" className="bg-green-600">تم التسليم</Badge>
                    ) : isExpired ? (
                      <Badge variant="destructive">متأخر</Badge>
                    ) : (
                      <Badge variant="outline">قيد الانتظار</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{hw.classroom?.name}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm line-clamp-3">{hw.description}</p>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>آخر موعد: {format(new Date(hw.due_date), 'PPP', { locale: arEG })}</span>
                  </div>

                  {isSubmitted && hw.submission?.grade !== undefined && (
                     <div className="mt-2 p-2 bg-primary/10 rounded text-sm font-semibold text-primary text-center">
                        الدرجة: {hw.submission.grade} / 10
                     </div>
                  )}
                </CardContent>
                <CardFooter>
                  {isSubmitted ? (
                    <Button variant="outline" className="w-full cursor-default" disabled>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      تم الإرسال في {format(new Date(hw.submission!.submitted_at), 'd MMM', { locale: arEG })}
                    </Button>
                  ) : (
                    <Dialog open={isDialogOpen && submittingId === hw.id} onOpenChange={(open) => {
                      setIsDialogOpen(open);
                      if (open) setSubmittingId(hw.id);
                      else { setSubmittingId(null); setAnswer(''); }
                    }}>
                      <DialogTrigger asChild>
                        <Button className="w-full" disabled={isExpired}>
                          <FileText className="h-4 w-4 mr-2" />
                          {isExpired ? 'انتهى الوقت' : 'حل الواجب'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>حل الواجب: {hw.title}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div className="p-3 bg-muted rounded-md text-sm">
                            {hw.description}
                          </div>
                          <div className="space-y-2">
                            <Label>إجابتك</Label>
                            <Textarea 
                              placeholder="اكتب الحل هنا..." 
                              className="min-h-[150px]"
                              value={answer}
                              onChange={(e) => setAnswer(e.target.value)}
                            />
                          </div>
                          <Button 
                            className="w-full" 
                            onClick={() => handleSubmit(hw.id)}
                            disabled={!answer.trim() || submittingId !== hw.id} // Ensure we only submit for active dialog
                          >
                            {submittingId === hw.id && isDialogOpen ? 'جاري الإرسال...' : 'إرسال الحل'} 
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
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
