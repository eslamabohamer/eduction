import { useEffect, useState } from 'react';
import { studentService } from '@/services/studentService';
import { supabase } from '@/lib/supabase';
import { AttendanceRecord } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { arEG } from 'date-fns/locale';

export default function StudentAttendancePage() {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [date, setDate] = useState<Date | undefined>(new Date());

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase
                .from('student_profiles')
                .select('id')
                .eq('user_id', user?.id)
                .single();

            if (profile) {
                const response = await studentService.getAttendance(profile.id);
                if (response.success && response.data) {
                    setRecords(response.data);
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    // Helper to get status for a specific date
    const getStatusForDate = (day: Date) => {
        const record = records.find(r =>
            new Date(r.date).toDateString() === day.toDateString()
        );
        return record?.status;
    };

    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const lateCount = records.filter(r => r.status === 'late').length;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">سجل الحضور</h1>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-green-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-800">حضور</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-900">{presentCount} يوم</div>
                    </CardContent>
                </Card>
                <Card className="bg-red-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-800">غياب</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-900">{absentCount} يوم</div>
                    </CardContent>
                </Card>
                <Card className="bg-yellow-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-yellow-800">تأخير</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-900">{lateCount} يوم</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>التقويم</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            locale={arEG}
                            className="rounded-md border"
                            modifiers={{
                                present: (date) => getStatusForDate(date) === 'present',
                                absent: (date) => getStatusForDate(date) === 'absent',
                                late: (date) => getStatusForDate(date) === 'late',
                            }}
                            modifiersStyles={{
                                present: { backgroundColor: '#dcfce7', color: '#166534', fontWeight: 'bold' },
                                absent: { backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: 'bold' },
                                late: { backgroundColor: '#fef9c3', color: '#854d0e', fontWeight: 'bold' },
                            }}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>تفاصيل اليوم المحدد</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {date ? (
                            <div className="space-y-4">
                                <div className="text-lg font-medium">
                                    {format(date, 'PPP', { locale: arEG })}
                                </div>

                                {getStatusForDate(date) ? (
                                    <div className="flex items-center gap-2">
                                        <span>الحالة:</span>
                                        <Badge variant={
                                            getStatusForDate(date) === 'present' ? 'default' :
                                                getStatusForDate(date) === 'absent' ? 'destructive' : 'secondary'
                                        }>
                                            {getStatusForDate(date) === 'present' ? 'حاضر' :
                                                getStatusForDate(date) === 'absent' ? 'غائب' : 'متأخر'}
                                        </Badge>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground">لا يوجد سجل لهذا اليوم</p>
                                )}
                            </div>
                        ) : (
                            <p className="text-muted-foreground">اختر يوماً من التقويم لعرض التفاصيل</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
