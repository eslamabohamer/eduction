// src/components/homework/HomeworkSubmissionsDialog.tsx
// نافذة تصحيح الواجبات
// Dialog for teachers to view and grade homework submissions.

import { useEffect, useState } from 'react';
import { homeworkService, HomeworkSubmission } from '@/services/homeworkService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { arEG } from 'date-fns/locale';
import { toast } from 'sonner';
import { Check, Save } from 'lucide-react';

interface Props {
  homeworkId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeworkTitle: string;
}

export function HomeworkSubmissionsDialog({ homeworkId, open, onOpenChange, homeworkTitle }: Props) {
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Grading state
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (open && homeworkId) {
      loadSubmissions();
    }
  }, [open, homeworkId]);

  async function loadSubmissions() {
    if (!homeworkId) return;
    setLoading(true);
    try {
      const data = await homeworkService.getSubmissions(homeworkId);
      setSubmissions(data);
      
      // Initialize state
      const initialGrades: Record<string, number> = {};
      const initialFeedbacks: Record<string, string> = {};
      data.forEach(s => {
        if (s.grade !== undefined) initialGrades[s.id] = s.grade;
        if (s.feedback) initialFeedbacks[s.id] = s.feedback;
      });
      setGrades(initialGrades);
      setFeedbacks(initialFeedbacks);
    } catch (error) {
      console.error(error);
      toast.error('فشل تحميل التسليمات');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveGrade(submissionId: string) {
    const grade = grades[submissionId];
    const feedback = feedbacks[submissionId] || '';
    
    if (grade === undefined) return;

    setSaving(submissionId);
    try {
      await homeworkService.gradeSubmission(submissionId, grade, feedback);
      toast.success('تم حفظ الدرجة');
    } catch (error) {
      console.error(error);
      toast.error('فشل حفظ الدرجة');
    } finally {
      setSaving(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>تسليمات الطلاب: {homeworkTitle}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden mt-4">
          {loading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/10">
              لا توجد تسليمات لهذا الواجب حتى الآن
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <Accordion type="single" collapsible className="space-y-4">
                {submissions.map((submission) => (
                  <AccordionItem key={submission.id} value={submission.id} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full ml-4">
                        <div className="text-right">
                          <div className="font-semibold">{submission.student?.user.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {submission.student?.student_code}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(submission.submitted_at), 'PPP p', { locale: arEG })}
                          </span>
                          {submission.grade !== undefined ? (
                            <Badge variant="default" className="bg-green-600">
                              {submission.grade} / 10
                            </Badge>
                          ) : (
                            <Badge variant="secondary">بانتظار التصحيح</Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4 border-t mt-2">
                      <div className="bg-muted/30 p-4 rounded-md whitespace-pre-wrap text-sm leading-relaxed">
                        {submission.content}
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-[100px_1fr_auto] items-end bg-muted/10 p-4 rounded-md border">
                        <div className="space-y-2">
                          <label className="text-xs font-medium">الدرجة (من 10)</label>
                          <Input 
                            type="number" 
                            min={0} 
                            max={10} 
                            value={grades[submission.id] ?? ''}
                            onChange={(e) => setGrades({
                              ...grades, 
                              [submission.id]: parseFloat(e.target.value)
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium">ملاحظات للمعلم</label>
                          <Textarea 
                            placeholder="أحسنت، ولكن..." 
                            className="h-10 min-h-[40px] resize-none"
                            value={feedbacks[submission.id] ?? ''}
                            onChange={(e) => setFeedbacks({
                              ...feedbacks, 
                              [submission.id]: e.target.value
                            })}
                          />
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleSaveGrade(submission.id)}
                          disabled={saving === submission.id}
                        >
                          {saving === submission.id ? (
                            'حفظ...'
                          ) : (
                            <>
                              <Save className="h-4 w-4 ml-2" />
                              حفظ
                            </>
                          )}
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
