import { useState, useEffect } from 'react';
import { studentService } from '@/services/studentService';
import { FinancialRecord } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { arEG } from 'date-fns/locale';
import { toast } from 'sonner';
import { Plus, DollarSign, Receipt } from 'lucide-react';

interface Props {
  studentId: string;
  readOnly?: boolean;
}

export function StudentFinancials({ studentId, readOnly = false }: Props) {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form State
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'payment' | 'fee' | 'discount'>('payment');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'completed' | 'pending'>('completed');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  useEffect(() => {
    loadFinancials();
  }, [studentId]);

  async function loadFinancials() {
    try {
      const data = await studentService.getFinancialRecords(studentId);
      setRecords(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddRecord() {
    if (!amount || !description) return;
    try {
      await studentService.addFinancialRecord({
        student_id: studentId,
        amount: parseFloat(amount),
        type,
        description: selectedMonth ? `${description} - شهر ${selectedMonth}` : description,
        status,
        date: new Date().toISOString()
      });
      toast.success('تم إضافة السجل المالي');
      setIsDialogOpen(false);
      setAmount('');
      setDescription('');
      setSelectedMonth('');
      loadFinancials();
    } catch (error) {
      console.error(error);
      toast.error('فشل إضافة السجل');
    }
  }

  // Calculations
  const totalFees = records.filter(r => r.type === 'fee').reduce((acc, curr) => acc + curr.amount, 0);
  const totalPayments = records.filter(r => r.type === 'payment').reduce((acc, curr) => acc + curr.amount, 0);
  const totalDiscounts = records.filter(r => r.type === 'discount').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalFees - (totalPayments + totalDiscounts);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFees.toLocaleString()} ج.م</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المدفوعات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalPayments.toLocaleString()} ج.م</div>
            <p className="text-xs text-muted-foreground">+ {totalDiscounts} خصومات</p>
          </CardContent>
        </Card>
        <Card className={balance > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الرصيد المتبقي</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {balance.toLocaleString()} ج.م
            </div>
            <p className="text-xs text-muted-foreground">
              {balance > 0 ? 'مستحق الدفع' : 'خالص'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">سجل المعاملات</h3>
        {!readOnly && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                معاملة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة معاملة مالية</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>النوع</Label>
                    <Select value={type} onValueChange={(v: any) => setType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="payment">دفع (تحصيل)</SelectItem>
                        <SelectItem value="fee">مصروفات (استحقاق)</SelectItem>
                        <SelectItem value="discount">خصم</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>المبلغ</Label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>الشهر (اختياري)</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الشهر" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month} value={month}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>الوصف</Label>
                  <Input
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="مثال: قسط شهر أكتوبر"
                  />
                </div>

                <div className="space-y-2">
                  <Label>الحالة</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">مكتمل</SelectItem>
                      <SelectItem value="pending">معلق</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full" onClick={handleAddRecord}>حفظ</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-right">الوصف</TableHead>
              <TableHead className="text-right">النوع</TableHead>
              <TableHead className="text-right">المبلغ</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد معاملات مالية</TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{format(new Date(record.date), 'PPP', { locale: arEG })}</TableCell>
                  <TableCell>{record.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      record.type === 'payment' ? 'border-green-500 text-green-600' :
                        record.type === 'fee' ? 'border-red-500 text-red-600' :
                          'border-blue-500 text-blue-600'
                    }>
                      {record.type === 'payment' ? 'دفع' : record.type === 'fee' ? 'مصروفات' : 'خصم'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold">{record.amount.toLocaleString()} ج.م</TableCell>
                  <TableCell>
                    {record.status === 'completed' ? (
                      <Badge className="bg-green-500">مكتمل</Badge>
                    ) : (
                      <Badge variant="secondary">معلق</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
