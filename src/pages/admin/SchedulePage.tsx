import { useState, useEffect } from 'react';
import { scheduleService, LessonSchedule } from '@/services/scheduleService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function SchedulePage() {
    const [schedules, setSchedules] = useState<LessonSchedule[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters / Form Data
    const [level, setLevel] = useState('ثانوي');
    const [grade, setGrade] = useState('الصف الأول');

    // New Schedule Form
    const [newSchedule, setNewSchedule] = useState({
        subject_name: '',
        day_of_week: '0',
        start_time: '',
        end_time: ''
    });

    const days = [
        { value: '0', label: 'الأحد' },
        { value: '1', label: 'الاثنين' },
        { value: '2', label: 'الثلاثاء' },
        { value: '3', label: 'الأربعاء' },
        { value: '4', label: 'الخميس' },
        { value: '5', label: 'الجمعة' },
        { value: '6', label: 'السبت' },
    ];

    useEffect(() => {
        loadSchedules();
    }, [level, grade]);

    async function loadSchedules() {
        setLoading(true);
        const response = await scheduleService.getSchedules(grade, level);
        if (response.success && response.data) {
            setSchedules(response.data);
        } else {
            toast.error('فشل تحميل الجدول');
        }
        setLoading(false);
    }

    async function handleAddSchedule(e: React.FormEvent) {
        e.preventDefault();
        if (!newSchedule.subject_name || !newSchedule.start_time || !newSchedule.end_time) {
            toast.error('يرجى ملء جميع الحقول');
            return;
        }

        const response = await scheduleService.createSchedule({
            grade,
            level,
            subject_name: newSchedule.subject_name,
            day_of_week: parseInt(newSchedule.day_of_week),
            start_time: newSchedule.start_time,
            end_time: newSchedule.end_time
        });

        if (response.success) {
            toast.success('تم إضافة الحصة بنجاح');
            setNewSchedule({ ...newSchedule, subject_name: '' });
            loadSchedules();
        } else {
            toast.error('فشل إضافة الحصة');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('هل أنت متأكد من الحذف؟')) return;

        const response = await scheduleService.deleteSchedule(id);
        if (response.success) {
            toast.success('تم الحذف بنجاح');
            loadSchedules();
        } else {
            toast.error('فشل الحذف');
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">جدول الحصص</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Controls & Form */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>تحديد الفصل</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>المرحلة</Label>
                                <Select value={level} onValueChange={setLevel}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ابتدائي">ابتدائي</SelectItem>
                                        <SelectItem value="اعدادي">اعدادي</SelectItem>
                                        <SelectItem value="ثانوي">ثانوي</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>الصف</Label>
                                <Select value={grade} onValueChange={setGrade}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="الصف الأول">الصف الأول</SelectItem>
                                        <SelectItem value="الصف الثاني">الصف الثاني</SelectItem>
                                        <SelectItem value="الصف الثالث">الصف الثالث</SelectItem>
                                        {level === 'ابتدائي' && (
                                            <>
                                                <SelectItem value="الصف الرابع">الصف الرابع</SelectItem>
                                                <SelectItem value="الصف الخامس">الصف الخامس</SelectItem>
                                                <SelectItem value="الصف السادس">الصف السادس</SelectItem>
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>إضافة حصة جديدة</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddSchedule} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>المادة</Label>
                                    <Input
                                        value={newSchedule.subject_name}
                                        onChange={e => setNewSchedule({ ...newSchedule, subject_name: e.target.value })}
                                        placeholder="مثال: رياضيات"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>اليوم</Label>
                                    <Select
                                        value={newSchedule.day_of_week}
                                        onValueChange={v => setNewSchedule({ ...newSchedule, day_of_week: v })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {days.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-2">
                                        <Label>من</Label>
                                        <Input
                                            type="time"
                                            value={newSchedule.start_time}
                                            onChange={e => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>إلى</Label>
                                        <Input
                                            type="time"
                                            value={newSchedule.end_time}
                                            onChange={e => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full gap-2">
                                    <Plus className="h-4 w-4" /> إضافة
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Schedule Display */}
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                الجدول الأسبوعي
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>اليوم</TableHead>
                                        <TableHead>المادة</TableHead>
                                        <TableHead>التوقيت</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={4} className="text-center">جاري التحميل...</TableCell></TableRow>
                                    ) : schedules.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">لا يوجد حصص مضافة</TableCell></TableRow>
                                    ) : (
                                        schedules.map((schedule) => (
                                            <TableRow key={schedule.id}>
                                                <TableCell className="font-medium">
                                                    {days.find(d => d.value === schedule.day_of_week.toString())?.label}
                                                </TableCell>
                                                <TableCell>{schedule.subject_name}</TableCell>
                                                <TableCell dir="ltr" className="text-right">
                                                    {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(schedule.id)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
