import { useEffect, useState } from 'react';
import { parentService } from '@/services/parentService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { DollarSign, Download, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { arEG } from 'date-fns/locale';

export default function ParentFinancePage() {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadFinancials();
    }, []);

    async function loadFinancials() {
        try {
            const data = await parentService.getAllFinancials();
            setRecords(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const totalDue = records
        .filter(r => r.type === 'fee' && r.status !== 'completed')
        .reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">المالية والمدفوعات</h1>
                    <p className="text-muted-foreground">متابعة الرسوم الدراسية والمدفوعات لجميع الأبناء</p>
                </div>
                <Card className="w-full md:w-auto bg-primary text-primary-foreground">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-primary-foreground/10 rounded-full">
                            <DollarSign className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium opacity-90">إجمالي المستحق</p>
                            <p className="text-2xl font-bold">{totalDue.toLocaleString()} ج.م</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>سجل المعاملات</CardTitle>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Filter className="h-4 w-4" />
                        تصفية
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-right">التاريخ</TableHead>
                                <TableHead className="text-right">الطالب</TableHead>
                                <TableHead className="text-right">الوصف</TableHead>
                                <TableHead className="text-right">النوع</TableHead>
                                <TableHead className="text-right">المبلغ</TableHead>
                                <TableHead className="text-right">الحالة</TableHead>
                                <TableHead className="text-right">إجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {records.map((record) => (
                                <TableRow key={record.id}>
                                    <TableCell>
                                        {format(new Date(record.date), 'dd/MM/yyyy')}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {record.student?.user?.name}
                                    </TableCell>
                                    <TableCell>{record.description}</TableCell>
                                    <TableCell>
                                        <Badge variant={record.type === 'payment' ? 'default' : 'secondary'}>
                                            {record.type === 'payment' ? 'دفع' : 'رسوم'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className={record.type === 'payment' ? 'text-green-600' : 'text-red-600'}>
                                        {record.type === 'payment' ? '+' : '-'}{record.amount}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            record.status === 'completed' ? 'outline' :
                                                record.status === 'overdue' ? 'destructive' : 'secondary'
                                        } className={
                                            record.status === 'completed' ? 'border-green-500 text-green-600' : ''
                                        }>
                                            {record.status === 'completed' ? 'مكتمل' :
                                                record.status === 'pending' ? 'معلق' :
                                                    record.status === 'overdue' ? 'متأخر' : 'ملغي'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {record.type === 'payment' && (
                                            <Button variant="ghost" size="icon">
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {records.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        لا توجد سجلات مالية
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
