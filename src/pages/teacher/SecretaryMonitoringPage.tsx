import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { activityLogService, ActivityLog } from '@/services/activityLogService';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Loader2, Search, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function SecretaryMonitoringPage() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadLogs();
    }, []);

    async function loadLogs() {
        try {
            setLoading(true);
            setError(null);
            // Fetch logs specifically for Secretaries
            const data = await activityLogService.getLogs({ role: 'Secretary' });
            setLogs(data || []);
        } catch (err: any) {
            console.error('Failed to load logs', err);
            if (err.message?.includes('404') || err.code === '42P01') {
                setError('جدول السجلات غير موجود. يرجى تشغيل ملف الترحيل (Migration) الجديد في قاعدة البيانات.');
            } else {
                setError('حدث خطأ أثناء تحميل السجلات. يرجى المحاولة مرة أخرى.');
            }
        } finally {
            setLoading(false);
        }
    }

    const filteredLogs = logs.filter(log =>
        log.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getActionLabel = (action: string) => {
        const map: Record<string, string> = {
            'create_student': 'إضافة طالب',
            'update_student': 'تعديل طالب',
            'delete_student': 'حذف طالب',
            'create_homework': 'إضافة واجب',
            'grade_homework': 'تصحيح واجب',
            'create_fee': 'إضافة رسوم',
            'assign_fee': 'تعيين رسوم',
            'record_payment': 'تسجيل دفعة',
        };
        return map[action] || action;
    };

    const getEntityLabel = (entity: string) => {
        const map: Record<string, string> = {
            'student': 'طالب',
            'homework': 'واجب',
            'fee_structure': 'هيكل رسوم',
            'financial_record': 'سجل مالي',
        };
        return map[entity] || entity;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">متابعة السكرتارية</h1>
            </div>

            {error && (
                <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md flex items-center gap-2 border border-destructive/20">
                    <AlertCircle className="h-5 w-5" />
                    <span>{error}</span>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>سجل النشاطات</CardTitle>
                    <div className="relative max-w-sm mt-2">
                        <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="بحث في السجل..."
                            className="pr-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">التاريخ والوقت</TableHead>
                                    <TableHead className="text-right">المستخدم</TableHead>
                                    <TableHead className="text-right">الحدث</TableHead>
                                    <TableHead className="text-right">التفاصيل</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            {error ? 'تعذر تحميل البيانات' : 'لا توجد سجلات'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                {format(new Date(log.created_at), 'Pp', { locale: ar })}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{log.user?.name}</div>
                                                <div className="text-xs text-muted-foreground">سكرتارية</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {getActionLabel(log.action_type)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-md truncate">
                                                {/* Display relevant details based on action */}
                                                {log.details?.student_name && (
                                                    <span className="ml-2">الطالب: {log.details.student_name}</span>
                                                )}
                                                {log.details?.amount && (
                                                    <span className="ml-2">المبلغ: {log.details.amount}</span>
                                                )}
                                                {log.details?.title && (
                                                    <span className="ml-2">العنوان: {log.details.title}</span>
                                                )}
                                                {/* Fallback for other details */}
                                                {!log.details?.student_name && !log.details?.amount && !log.details?.title && (
                                                    <span className="text-xs text-muted-foreground">{JSON.stringify(log.details)}</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
