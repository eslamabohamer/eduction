// src/pages/secretary/SecretaryFinancePage.tsx
// صفحة الإدارة المالية للسكرتارية
// Page for Secretaries to view and manage all financial records.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FinancialRecord } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, DollarSign, Filter, Download } from 'lucide-react';
import { format } from 'date-fns';
import { arEG } from 'date-fns/locale';
import { toast } from 'sonner';

export default function SecretaryFinancePage() {
  const [records, setRecords] = useState<(FinancialRecord & { student_name: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadRecords();
  }, []);

  async function loadRecords() {
    try {
      const { data, error } = await supabase
        .from('financial_records')
        .select(`
          *,
          student:student_profiles(
            user:users(name)
          )
        `)
        .order('date', { ascending: false });

      if (error) throw error;

      const formatted = data.map((item: any) => ({
        ...item,
        student_name: item.student?.user?.name || 'غير معروف'
      }));

      setRecords(formatted);
    } catch (error) {
      console.error(error);
      toast.error('فشل تحميل السجلات المالية');
    } finally {
      setLoading(false);
    }
  }

  // Filter logic
  const filteredRecords = records.filter(r => {
    const matchesSearch = r.student_name.toLowerCase().includes(search.toLowerCase()) ||
                          r.description.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || r.type === filterType;
    return matchesSearch && matchesType;
  });

  // Stats
  const totalIncome = filteredRecords
    .filter(r => r.type === 'payment')
    .reduce((sum, r) => sum + r.amount, 0);
    
  const totalFees = filteredRecords
    .filter(r => r.type === 'fee')
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الإدارة المالية</h1>
          <p className="text-muted-foreground">متابعة المدفوعات والمصروفات الدراسية</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          تصدير التقرير
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي التحصيل</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalIncome.toLocaleString()} ج.م</div>
            <p className="text-xs text-muted-foreground">من السجلات المعروضة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المطالبات</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalFees.toLocaleString()} ج.م</div>
            <p className="text-xs text-muted-foreground">مصروفات مستحقة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">صافي الرصيد</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{(totalFees - totalIncome).toLocaleString()} ج.م</div>
            <p className="text-xs text-muted-foreground">مبالغ متبقية للتحصيل</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث باسم الطالب أو الوصف..."
            className="pr-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 ml-2" />
            <SelectValue placeholder="تصفية حسب النوع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="payment">مدفوعات (تحصيل)</SelectItem>
            <SelectItem value="fee">مصروفات (استحقاق)</SelectItem>
            <SelectItem value="discount">خصومات</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-right">الطالب</TableHead>
              <TableHead className="text-right">الوصف</TableHead>
              <TableHead className="text-right">النوع</TableHead>
              <TableHead className="text-right">المبلغ</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">جاري التحميل...</TableCell>
              </TableRow>
            ) : filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد سجلات مطابقة</TableCell>
              </TableRow>
            ) : (
              filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{format(new Date(record.date), 'PPP', { locale: arEG })}</TableCell>
                  <TableCell className="font-medium">{record.student_name}</TableCell>
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
