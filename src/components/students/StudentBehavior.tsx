import { useState, useEffect } from 'react';
import { studentService } from '@/services/studentService';
import { BehaviorNote } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formatDistanceToNow } from 'date-fns';
import { arEG } from 'date-fns/locale';
import { toast } from 'sonner';
import { Plus, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';

interface Props {
  studentId: string;
  readOnly?: boolean;
}

export function StudentBehavior({ studentId, readOnly = false }: Props) {
  const [notes, setNotes] = useState<BehaviorNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'positive' | 'negative' | 'neutral'>('neutral');

  useEffect(() => {
    loadNotes();
  }, [studentId]);

  async function loadNotes() {
    const response = await studentService.getBehaviorNotes(studentId);
    if (response.success && response.data) {
      setNotes(response.data);
    } else {
      console.error(response.error);
    }
    setLoading(false);
  }

  async function handleAddNote() {
    if (!title) return;
    const response = await studentService.addBehaviorNote({
      student_id: studentId,
      title,
      description,
      type
    });

    if (response.success) {
      toast.success('تم إضافة الملاحظة');
      setIsDialogOpen(false);
      setTitle('');
      setDescription('');
      loadNotes();
    } else {
      toast.error(response.error?.message || 'فشل إضافة الملاحظة');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">سجل السلوك والملاحظات</h3>
        {!readOnly && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة ملاحظة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة ملاحظة سلوكية</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>العنوان</Label>
                  <Input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="مثال: مشاركة فعالة في الفصل"
                  />
                </div>

                <div className="space-y-2">
                  <Label>النوع</Label>
                  <Select value={type} onValueChange={(v: any) => setType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positive">إيجابي (ممتاز)</SelectItem>
                      <SelectItem value="negative">سلبي (تنبيه)</SelectItem>
                      <SelectItem value="neutral">ملاحظة عامة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>التفاصيل</Label>
                  <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="تفاصيل الموقف..."
                  />
                </div>

                <Button className="w-full" onClick={handleAddNote}>حفظ</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {notes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
            لا توجد ملاحظات سلوكية مسجلة
          </div>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className={`border-r-4 ${note.type === 'positive' ? 'border-r-green-500' :
                note.type === 'negative' ? 'border-r-red-500' :
                  'border-r-blue-500'
              }`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {note.type === 'positive' ? <ThumbsUp className="h-5 w-5 text-green-500" /> :
                      note.type === 'negative' ? <ThumbsDown className="h-5 w-5 text-red-500" /> :
                        <MessageSquare className="h-5 w-5 text-blue-500" />}
                    <CardTitle className="text-base">{note.title}</CardTitle>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: arEG })}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{note.description}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
