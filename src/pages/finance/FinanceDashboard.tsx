import { useEffect, useState } from 'react';
import { financeService, FinancialStats } from '@/services/financeService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, AlertCircle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

export default function FinanceDashboard() {
    const [stats, setStats] = useState<FinancialStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    async function loadStats() {
        const response = await financeService.getStats();
        if (response.success && response.data) {
            setStats(response.data);
        } else {
            toast.error('فشل تحميل الإحصائيات');
        }
        setLoading(false);
    }

    if (loading) return <div>جاري التحميل...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">لوحة المعلومات المالية</h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total_revenue?.toLocaleString()} ج.م</div>
                        <p className="text-xs text-muted-foreground">إجمالي المبالغ المحصلة</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إيرادات هذا الشهر</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.monthly_revenue?.toLocaleString()} ج.م</div>
                        <p className="text-xs text-muted-foreground">التحصيل خلال الشهر الحالي</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">مستحقات معلقة</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total_pending?.toLocaleString()} ج.م</div>
                        <p className="text-xs text-muted-foreground">رسوم لم يتم تحصيلها بعد</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">متأخرات</CardTitle>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{stats?.total_overdue?.toLocaleString()} ج.م</div>
                        <p className="text-xs text-muted-foreground">رسوم تجاوزت موعد الاستحقاق</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
