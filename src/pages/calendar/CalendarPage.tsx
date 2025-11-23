// src/pages/calendar/CalendarPage.tsx
// صفحة التقويم الموحد
// Unified calendar showing all events.

import { useEffect, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { examService } from '@/services/examService';
import { liveSessionService } from '@/services/liveSessionService';
import { homeworkService } from '@/services/homeworkService';
import { arEG } from 'date-fns/locale';
import { format } from 'date-fns';

type Event = {
  id: string;
  title: string;
  date: Date;
  type: 'exam' | 'live' | 'homework';
};

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const [exams, sessions, homeworks] = await Promise.all([
        examService.getExams(),
        liveSessionService.getSessions(),
        homeworkService.getHomeworks()
      ]);

      const allEvents: Event[] = [
        ...exams.map(e => ({ id: e.id, title: `اختبار: ${e.title}`, date: new Date(e.start_time), type: 'exam' as const })),
        ...sessions.map(s => ({ id: s.id, title: `بث: ${s.title}`, date: new Date(s.start_time), type: 'live' as const })),
        ...homeworks.map(h => ({ id: h.id, title: `واجب: ${h.title}`, date: new Date(h.due_date), type: 'homework' as const })),
      ];

      setEvents(allEvents);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // Filter events for selected date
  const selectedDateEvents = events.filter(e => 
    date && e.date.toDateString() === date.toDateString()
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">التقويم الدراسي</h1>
      
      <div className="grid md:grid-cols-[300px_1fr] gap-6">
        <Card className="h-fit">
          <CardContent className="p-3">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              locale={arEG}
              className="rounded-md border"
              modifiers={{
                hasEvent: (date) => events.some(e => e.date.toDateString() === date.toDateString())
              }}
              modifiersStyles={{
                hasEvent: { fontWeight: 'bold', textDecoration: 'underline', color: 'var(--primary)' }
              }}
            />
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle>
              أحداث {date ? format(date, 'PPP', { locale: arEG }) : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>جاري التحميل...</p>
            ) : selectedDateEvents.length === 0 ? (
              <p className="text-muted-foreground">لا توجد أحداث في هذا اليوم</p>
            ) : (
              <div className="space-y-4">
                {selectedDateEvents.map(event => (
                  <div key={event.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent transition-colors">
                    <div className={`w-2 h-12 rounded-full ${
                      event.type === 'exam' ? 'bg-red-500' : 
                      event.type === 'live' ? 'bg-blue-500' : 'bg-green-500'
                    }`} />
                    <div>
                      <h4 className="font-semibold">{event.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(event.date, 'p', { locale: arEG })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
