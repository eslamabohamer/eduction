// src/pages/student/TakeExamPage.tsx
// صفحة أداء الاختبار للطالب
// Interface for students to take an exam.

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examService, Exam, ExamQuestion } from '@/services/examService';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Timer } from 'lucide-react';

export default function TakeExamPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) loadExam();
  }, [id]);

  async function loadExam() {
    try {
      const data = await examService.getExamById(id!);
      setExam(data);
      setQuestions(data.questions || []);
    } catch (error) {
      console.error(error);
      toast.error('فشل تحميل الاختبار');
      navigate('/exams');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!confirm('هل أنت متأكد من تسليم الإجابات؟ لا يمكن التراجع بعد ذلك.')) return;
    
    setSubmitting(true);
    try {
      // Get current student profile id
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('Student profile not found');

      // Calculate simple score for MCQs (Server side should ideally validate this)
      let score = 0;
      questions.forEach(q => {
        if (q.question_type === 'MCQ' || q.question_type === 'TrueFalse') {
          if (answers[q.id!] === q.correct_answer) {
            score += q.points;
          }
        }
      });

      const { error } = await supabase
        .from('exam_submissions')
        .insert({
          exam_id: id,
          student_id: profile.id,
          answers: answers,
          score: score, // Preliminary score
          submitted_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('تم تسليم الاختبار بنجاح!');
      navigate('/exams');
    } catch (error) {
      console.error(error);
      toast.error('فشل تسليم الاختبار');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-10 text-center">جاري تحميل الاختبار...</div>;
  if (!exam) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      <Card className="border-primary/20 shadow-md">
        <CardHeader className="text-center border-b bg-primary/5">
          <CardTitle className="text-2xl text-primary">{exam.title}</CardTitle>
          <div className="flex justify-center gap-4 text-sm text-muted-foreground mt-2">
            <span className="flex items-center gap-1"><Timer className="h-4 w-4" /> {exam.duration_minutes} دقيقة</span>
            <span>{questions.length} سؤال</span>
            <span>{exam.total_marks} درجة</span>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-6">
        {questions.map((q, index) => (
          <Card key={q.id}>
            <CardHeader>
              <CardTitle className="text-base font-medium flex gap-2">
                <span className="bg-muted h-6 w-6 flex items-center justify-center rounded-full text-xs">
                  {index + 1}
                </span>
                {q.question_text}
                <span className="mr-auto text-xs font-normal text-muted-foreground">
                  ({q.points} درجات)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {q.question_type === 'MCQ' && q.options && (
                <RadioGroup 
                  value={answers[q.id!] || ''} 
                  onValueChange={(val) => setAnswers({...answers, [q.id!]: val})}
                >
                  {q.options.map((opt, i) => (
                    <div key={i} className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value={opt} id={`${q.id}-${i}`} />
                      <Label htmlFor={`${q.id}-${i}`} className="font-normal cursor-pointer w-full py-2">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {q.question_type === 'TrueFalse' && (
                <RadioGroup 
                  value={answers[q.id!] || ''} 
                  onValueChange={(val) => setAnswers({...answers, [q.id!]: val})}
                >
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="true" id={`${q.id}-t`} />
                    <Label htmlFor={`${q.id}-t`}>صواب</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="false" id={`${q.id}-f`} />
                    <Label htmlFor={`${q.id}-f`}>خطأ</Label>
                  </div>
                </RadioGroup>
              )}

              {(q.question_type === 'ShortAnswer' || q.question_type === 'Essay') && (
                <Textarea 
                  placeholder="اكتب إجابتك هنا..." 
                  value={answers[q.id!] || ''}
                  onChange={(e) => setAnswers({...answers, [q.id!]: e.target.value})}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex justify-center">
        <Button size="lg" className="w-full max-w-md" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'جاري التسليم...' : 'تسليم الاختبار'}
        </Button>
      </div>
    </div>
  );
}
