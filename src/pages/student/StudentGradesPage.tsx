import { useEffect, useState } from 'react';
import { studentService } from '@/services/studentService';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { GraduationCap, BookOpen, Award } from 'lucide-react';

export default function StudentGradesPage() {
    const [stats, setStats] = useState<{
        exams: any[];
        homeworks: any[];
    }>({ exams: [], homeworks: [] });

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
                const response = await studentService.getAcademicStats(profile.id);
                if (response.success && response.data) {
                    setStats(response.data);
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    const averageScore = stats.exams.length > 0
        ? Math.round(stats.exams.reduce((acc, curr) => acc + curr.percentage, 0) / stats.exams.length)
        : 0;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">سجلي الأكاديمي</h1>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">المعدل العام</CardTitle>
                        <Award className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{averageScore}%</div>
                        <p className="text-xs text-muted-foreground">بناءً على نتائج الامتحانات</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">الامتحانات المكتملة</CardTitle>
                        <GraduationCap className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.exams.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">الواجبات المسلمة</CardTitle>
                        <BookOpen className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.homeworks.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="exams" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="exams">نتائج الامتحانات</TabsTrigger>
                    <TabsTrigger value="homework">درجات الواجبات</TabsTrigger>
                    <TabsTrigger value="charts">الرسوم البيانية</TabsTrigger>
                </TabsList>

                <TabsContent value="exams" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>سجل الامتحانات</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-right">الامتحان</TableHead>
                                        <TableHead className="text-right">الدرجة</TableHead>
                                        <TableHead className="text-right">النسبة المئوية</TableHead>
                                        <TableHead className="text-right">التقدير</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.exams.map((exam, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{exam.name}</TableCell>
                                            <TableCell>{exam.score} / {exam.total}</TableCell>
                                            <TableCell>{Math.round(exam.percentage)}%</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded text-xs ${exam.percentage >= 90 ? 'bg-green-100 text-green-800' :
                                                    exam.percentage >= 75 ? 'bg-blue-100 text-blue-800' :
                                                        exam.percentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'
                                                    }`}>
                                                    {exam.percentage >= 90 ? 'ممتاز' :
                                                        exam.percentage >= 75 ? 'جيد جداً' :
                                                            exam.percentage >= 50 ? 'ناجح' : 'راسب'}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {stats.exams.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                لا توجد نتائج امتحانات مسجلة
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="homework">
                    <Card>
                        <CardHeader>
                            <CardTitle>سجل الواجبات</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-right">الواجب</TableHead>
                                        <TableHead className="text-right">الدرجة</TableHead>
                                        <TableHead className="text-right">الحالة</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.homeworks.map((hw, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{hw.name}</TableCell>
                                            <TableCell>{hw.score} / {hw.total}</TableCell>
                                            <TableCell>
                                                <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">
                                                    تم التسليم
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {stats.homeworks.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                                لا توجد واجبات مسجلة
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="charts">
                    <Card>
                        <CardHeader>
                            <CardTitle>تحليل الأداء</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.exams}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="percentage" name="النسبة المئوية" radius={[4, 4, 0, 0]}>
                                        {stats.exams.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.percentage >= 50 ? '#3b82f6' : '#ef4444'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
