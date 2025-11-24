import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';

interface Fee {
    id: string;
    name: string;
    amount: number;
    type: string;
    level: string;
    grade: string;
}

const FeeManagementPage: React.FC = () => {
    const [newFee, setNewFee] = useState<Omit<Fee, 'id'> & { id?: string }>({
        name: '',
        amount: 0,
        type: 'tuition',
        level: '',
        grade: ''
    });

    const [fees, setFees] = useState<Fee[]>([
        // Sample data
        {
            id: '1',
            name: 'مصروفات الترم الأول',
            amount: 1500,
            type: 'tuition',
            level: 'ابتدائي',
            grade: 'الصف الأول'
        }
    ]);

    const handleAddFee = () => {
        if (!newFee.name || !newFee.amount || !newFee.level || !newFee.grade) {
            alert('يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        const feeToAdd: Fee = {
            ...newFee,
            id: Date.now().toString()
        };

        setFees(prev => [...prev, feeToAdd]);
        setNewFee({
            name: '',
            amount: 0,
            type: 'tuition',
            level: '',
            grade: ''
        });
    };

    const handleDelete = (id: string) => {
        setFees(prev => prev.filter(fee => fee.id !== id));
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">إدارة المصروفات</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>إضافة مصروفات جديدة</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>اسم المصروفات</Label>
                                    <Input
                                        value={newFee.name}
                                        onChange={e => setNewFee({ ...newFee, name: e.target.value })}
                                        placeholder="مثال: مصروفات الترم الأول"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>المبلغ</Label>
                                    <Input
                                        type="number"
                                        value={newFee.amount}
                                        onChange={e => setNewFee({ ...newFee, amount: Number(e.target.value) })}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>النوع</Label>
                                    <Select value={newFee.type} onValueChange={v => setNewFee({ ...newFee, type: v })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="اختر النوع" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="tuition">مصروفات دراسية</SelectItem>
                                            <SelectItem value="bus">اشتراك باص</SelectItem>
                                            <SelectItem value="books">كتب ومذكرات</SelectItem>
                                            <SelectItem value="uniform">زي مدرسي</SelectItem>
                                            <SelectItem value="activity">أنشطة</SelectItem>
                                            <SelectItem value="other">أخرى</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-2">
                                        <Label>المرحلة</Label>
                                        <Select value={newFee.level} onValueChange={v => setNewFee({ ...newFee, level: v })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر المرحلة" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ابتدائي">ابتدائي</SelectItem>
                                                <SelectItem value="إعدادي">إعدادي</SelectItem>
                                                <SelectItem value="ثانوي">ثانوي</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>الصف</Label>
                                        <Select value={newFee.grade} onValueChange={v => setNewFee({ ...newFee, grade: v })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر الصف" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="الصف الأول">الصف الأول</SelectItem>
                                                <SelectItem value="الصف الثاني">الصف الثاني</SelectItem>
                                                <SelectItem value="الصف الثالث">الصف الثالث</SelectItem>
                                                <SelectItem value="الصف الرابع">الصف الرابع</SelectItem>
                                                <SelectItem value="الصف الخامس">الصف الخامس</SelectItem>
                                                <SelectItem value="الصف السادس">الصف السادس</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <Button onClick={handleAddFee} className="w-full">
                                        إضافة المصروفات
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>قائمة الرسوم</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>الاسم</TableHead>
                                        <TableHead>النوع</TableHead>
                                        <TableHead>المبلغ</TableHead>
                                        <TableHead>المرحلة/الصف</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fees.map((fee) => (
                                        <TableRow key={fee.id}>
                                            <TableCell className="font-medium">{fee.name}</TableCell>
                                            <TableCell>
                                                {fee.type === 'tuition' ? 'مصروفات دراسية' :
                                                    fee.type === 'bus' ? 'اشتراك باص' :
                                                        fee.type === 'books' ? 'كتب ومذكرات' :
                                                            fee.type === 'uniform' ? 'زي مدرسي' :
                                                                fee.type === 'activity' ? 'أنشطة' : 'أخرى'}
                                            </TableCell>
                                            <TableCell>{fee.amount} ج.م</TableCell>
                                            <TableCell>{fee.level} - {fee.grade}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(fee.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default FeeManagementPage;