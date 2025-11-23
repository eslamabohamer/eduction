// src/pages/exams/CreateExam.tsx
// صفحة إنشاء اختبار جديد مع الأسئلة
// Page for creating a new exam and adding questions dynamically.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { classroomService, Classroom } from '@/services/classroomService';
import { examService } from '@/services/examService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Trash2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';

// Schema for validation
const examSchema = z.object({
  title: z.string().min(3, 'العنوان مطلوب'),
  description: z.string().optional(),
  classroom_id: z.string().min(1, 'يجب اختيار الفصل'),
  start_time: z.string().min(1, 'تاريخ البدء مطلوب'),
  end_time: z.string().min(1, 'تاريخ الانتهاء مطلوب'),
  duration_minutes: z.coerce.number().min(1, 'المدة مطلوبة'),
  total_marks: z.coerce.number().min(1, 'الدرجة الكلية مطلوبة'),
  questions: z.array(z.object({
    question_text: z.string().min(1, 'نص السؤال مطلوب'),
    question_type: z.enum(['MCQ', 'TrueFalse', 'ShortAnswer', 'Essay']),
    points: z.coerce.number().min(1),
    correct_answer: z.string().min(1, 'الإجابة الصحيحة مطلوبة'),
    options: z.array(z.string()).optional() // For MCQ
  }))
});

type ExamFormValues = z.infer<typeof examSchema>;

export default function CreateExam() {
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: '',
      description: '',
      duration_minutes: 60,
      total_marks: 100,
      questions: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions"
  });

  useEffect(() => {
    classroomService.getClassrooms().then(data => setClassrooms(data as any));
  }, []);

  async function onSubmit(data: ExamFormValues) {
    setLoading(true);
    try {
      // Format dates to ISO string for DB
      const formattedData = {
        ...data,
        start_time: new Date(data.start_time).toISOString(),
        end_time: new Date(data.end_time).toISOString(),
      };

      await examService.createExam(formattedData, data.questions as any);
      toast.success('تم إنشاء الاختبار بنجاح');
      navigate('/exams');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء إنشاء الاختبار');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">إنشاء اختبار جديد</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>بيانات الاختبار الأساسية</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>عنوان الاختبار</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: اختبار الفيزياء الشهري" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="classroom_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الفصل الدراسي</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الفصل" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classrooms.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_marks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الدرجة الكلية</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>وقت البدء</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>وقت الانتهاء</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المدة (دقيقة)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">الأسئلة ({fields.length})</h2>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => append({ 
                  question_text: '', 
                  question_type: 'MCQ', 
                  points: 1, 
                  correct_answer: '',
                  options: ['','','',''] 
                })}
              >
                <Plus className="h-4 w-4 ml-2" />
                إضافة سؤال
              </Button>
            </div>

            {fields.map((field, index) => (
              <Card key={field.id} className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 left-2 text-destructive"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name={`questions.${index}.question_text`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>نص السؤال {index + 1}</FormLabel>
                            <FormControl>
                              <Textarea placeholder="اكتب السؤال هنا..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="w-32">
                      <FormField
                        control={form.control}
                        name={`questions.${index}.points`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الدرجات</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`questions.${index}.question_type`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نوع السؤال</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="MCQ">اختيار من متعدد</SelectItem>
                              <SelectItem value="TrueFalse">صح أم خطأ</SelectItem>
                              <SelectItem value="Essay">مقالي</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`questions.${index}.correct_answer`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الإجابة الصحيحة</FormLabel>
                          <FormControl>
                            <Input placeholder="الإجابة النموذجية" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* MCQ Options Logic would go here - simplified for now */}
                  <p className="text-xs text-muted-foreground">
                    * في حالة الاختيار من متعدد، أدخل الخيارات مفصولة بفاصلة في حقل الإجابة مؤقتاً
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            <Save className="h-4 w-4 ml-2" />
            {loading ? 'جاري الحفظ...' : 'حفظ الاختبار'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
