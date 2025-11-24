import { Link, useLocation, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Receipt, Coins, FileText } from 'lucide-react';

export default function FinanceLayout() {
    const location = useLocation();

    const navItems = [
        { href: '/finance', label: 'لوحة المعلومات', icon: LayoutDashboard },
        { href: '/finance/transactions', label: 'المعاملات', icon: Receipt },
        { href: '/finance/fees', label: 'إدارة الرسوم', icon: Coins },
        { href: '/finance/reports', label: 'التقارير', icon: FileText },
    ];

    return (
        <div className="space-y-6">
            <div className="border-b">
                <div className="flex h-12 items-center gap-4">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        return (
                            <Link key={item.href} to={item.href}>
                                <Button
                                    variant={isActive ? 'default' : 'ghost'}
                                    size="sm"
                                    className="gap-2"
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </Button>
                            </Link>
                        );
                    })}
                </div>
            </div>
            <Outlet />
        </div>
    );
}
