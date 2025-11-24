import { useState, useEffect } from 'react';
import { studentService } from '@/services/studentService';
import { AttendanceRecord } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { arEG } from 'date-fns/locale';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

interface Props {
  studentId: string;
  readOnly?: boolean;
}

export function StudentAttendance({ studentId, readOnly = false }: Props) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [status, setStatus] = useState<'present' | 'absent' | 'late' | 'excused'>('present');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadAttendance();
  }, [studentId]);

  async function loadAttendance() {
    try {
      const data = await studentService.getAttendance(studentId);
      setRecords(data);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleAddAttendance() {
    if (!date) return;
    try {
      await studentService.addAttendance({
        student_id: studentId,
        date: format(date, 'yyyy-MM-dd'),
        status,
        notes
      });
      toast.success('تم تسجيل الحضور');
      setIsDialogOpen(false);
      loadAttendance();
    } catch (error) {
      console.error(error);
      toast.error('فشل تسجيل الحضور');
    }
  }

  // Calculate stats
  const totalDays = records.length;
  const presentDays = records.filter(r => r.status === 'present').length;
  const absentDays = records.filter(r => r.status === 'absent').length;
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  return (
    <div className="grid gap-6 md:grid-cols-[300px_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ملخص الحضور</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <div className="text-3xl font-bold text-primary">{attendanceRate}%</div>
              <div className="text-sm text-muted-foreground">نسبة الحضور</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>حضور: {presentDays}</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span>غياب: {absentDays}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border w-full"
              locale={arEG}
              modifiers={{
                present: (date) => records.some(r => r.status === 'present' && new Date(r.date).toDateString() === date.toDateString()),
                absent: (date) => records.some(r => r.status === 'absent' && new Date(r.date).toDateString() === date.toDateString()),
              }}
              modifiersStyles={{
                present: { color: 'green', fontWeight: 'bold' },
                absent: { color: 'red', fontWeight: 'bold' }
              }}
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">سجل الحضور والغياب</h3>
          {!readOnly && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>تسجيل حضور جديد</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>تسجيل حضور ليوم {date ? format(date, 'PPP', { locale: arEG }) : ''}</DialogTitle>
                  <DialogDescription>
                    قم بتسجيل حالة الحضور والملاحظات لهذا اليوم.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>الحالة</Label>
                    <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">حاضر</SelectItem>
                        <SelectItem value="absent">غائب</SelectItem>
                        <SelectItem value="late">متأخر</SelectItem>
                        <SelectItem value="excused">بعذر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>ملاحظات</Label>
                    <Textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="سبب الغياب أو التأخير..."
                    />
                  </div>
                  <Button className="w-full" onClick={handleAddAttendance}>حفظ</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {records.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">لا توجد سجلات حضور</div>
            ) : (
              <div className="divide-y">
                {records.map(record => (
                  <div key={record.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${record.status === 'present' ? 'bg-green-100 text-green-600' :
                        record.status === 'absent' ? 'bg-red-100 text-red-600' :
                          record.status === 'late' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-blue-100 text-blue-600'
                        }`}>
                        {record.status === 'present' ? <CheckCircle2 className="h-5 w-5" /> :
                          record.status === 'absent' ? <XCircle className="h-5 w-5" /> :
                            record.status === 'late' ? <Clock className="h-5 w-5" /> :
                              <AlertCircle className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="font-medium">
                          {record.status === 'present' ? 'حاضر' :
                            record.status === 'absent' ? 'غائب' :
                              record.status === 'late' ? 'متأخر' : 'غائب بعذر'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(record.date), 'PPP', { locale: arEG })}
                        </div>
                      </div>
                    </div>
                    {record.notes && (
                      <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {record.notes}
                      </div>
                    )}
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
