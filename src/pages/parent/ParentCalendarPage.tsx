import { useEffect, useState } from 'react';
import { parentService } from '@/services/parentService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { arEG } from 'date-fns/locale';
import { BookOpen, Calendar as CalendarIcon, Video, GraduationCap } from 'lucide-react';

export default function ParentCalendarPage() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadEvents();
    }, []);

    async function loadEvents() {
        try {
            // In a real app, we would fetch exams, live sessions, and attendance for all children
            // For this MVP, we'll simulate some events or fetch what we can
            // Let's fetch children first to get their IDs
            const children = await parentService.getMyChildren();

            // Mock events for demonstration as we don't have a unified events endpoint yet
            // In production, we'd create a service method `parentService.getUnifiedEvents()`
            const mockEvents = [
                {
                    id: '1',
                    title: 'امتحان رياضيات',
                    date: new Date(new Date().setDate(new Date().getDate() + 2)), // 2 days from now
                    type: 'exam',
                    student: children[0]?.user.name || 'الطالب'
                },
                {
                    id: '2',
                    title: 'حصة فيزياء مباشرة',
                    date: new Date(new Date().setDate(new Date().getDate() + 1)), // Tomorrow
                    type: 'live',
                    student: children[0]?.user.name || 'الطالب'
                },
                {
                    id: '3',
                    title: 'واجب كيمياء',
                    date: new Date(), // Today
                    type: 'homework',
                    student: children[0]?.user.name || 'الطالب'
                }
            ];

            setEvents(mockEvents);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const getEventsForDate = (day: Date) => {
        return events.filter(e =>
            new Date(e.date).toDateString() === day.toDateString()
        );
    };

    const selectedDateEvents = date ? getEventsForDate(date) : [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">التقويم الموحد</h1>
                <p className="text-muted-foreground">متابعة جميع الأحداث والامتحانات والواجبات للأبناء</p>
            </div>

            <div className="grid gap-6 md:grid-cols-[1fr_350px]">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>جدول الأحداث</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            locale={arEG}
                            className="rounded-md border shadow p-4 w-full flex justify-center"
                            modifiers={{
                                hasEvent: (date) => getEventsForDate(date).length > 0
                            }}
                            modifiersStyles={{
                                hasEvent: { fontWeight: 'bold', textDecoration: 'underline', color: 'var(--primary)' }
                            }}
                        />
                    </CardContent>
                </Card>

                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>
                            أحداث {date ? format(date, 'EEEE, d MMMM', { locale: arEG }) : 'اليوم المحدد'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {selectedDateEvents.length > 0 ? (
                                selectedDateEvents.map((event) => (
                                    <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                        <div className={`p-2 rounded-full ${event.type === 'exam' ? 'bg-red-100 text-red-600' :
                                                event.type === 'live' ? 'bg-blue-100 text-blue-600' :
                                                    'bg-green-100 text-green-600'
                                            }`}>
                                            {event.type === 'exam' ? <GraduationCap className="h-4 w-4" /> :
                                                event.type === 'live' ? <Video className="h-4 w-4" /> :
                                                    <BookOpen className="h-4 w-4" />}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium leading-none">{event.title}</p>
                                            <p className="text-xs text-muted-foreground">{event.student}</p>
                                            <Badge variant="outline" className="text-[10px] h-5">
                                                {format(new Date(event.date), 'p', { locale: arEG })}
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">
                                    <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                    <p>لا توجد أحداث لهذا اليوم</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
