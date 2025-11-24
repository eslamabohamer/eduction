import { useEffect, useState } from 'react';
import { notificationService, Notification } from '@/services/notificationService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, BookOpen, AlertCircle, Check, Info } from 'lucide-react';
import { format } from 'date-fns';
import { arEG } from 'date-fns/locale';

export default function StudentNotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNotifications();
    }, []);

    async function loadNotifications() {
        try {
            const data = await notificationService.getNotifications();
            setNotifications(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function markAsRead(id: string) {
        try {
            await notificationService.markAsRead(id);
            setNotifications(notifications.map(n =>
                n.id === id ? { ...n, is_read: true } : n
            ));
        } catch (error) {
            console.error(error);
        }
    }

    async function markAllAsRead() {
        try {
            await notificationService.markAllAsRead();
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error(error);
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'info': return <BookOpen className="h-5 w-5 text-blue-500" />;
            case 'warning': return <AlertCircle className="h-5 w-5 text-orange-500" />;
            case 'success': return <Check className="h-5 w-5 text-green-500" />;
            default: return <Info className="h-5 w-5 text-gray-500" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">الإشعارات</h1>
                <Button variant="outline" onClick={markAllAsRead} disabled={notifications.every(n => n.is_read)}>
                    تحديد الكل كمقروء
                </Button>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <p>جاري التحميل...</p>
                ) : notifications.length === 0 ? (
                    <p className="text-muted-foreground text-center py-10">لا توجد إشعارات جديدة</p>
                ) : (
                    notifications.map((notification) => (
                        <Card key={notification.id} className={`transition-colors ${notification.is_read ? 'bg-background' : 'bg-muted/30 border-primary/20'}`}>
                            <CardContent className="p-4 flex items-start gap-4">
                                <div className="mt-1 p-2 rounded-full bg-background border">
                                    {getIcon(notification.type)}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className={`font-medium ${notification.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>
                                            {notification.title}
                                        </p>
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(notification.created_at), 'PPP p', { locale: arEG })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{notification.body}</p>
                                </div>
                                {!notification.is_read && (
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => markAsRead(notification.id)}>
                                        <Check className="h-4 w-4" />
                                        <span className="sr-only">تحديد كمقروء</span>
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
