// src/pages/student/StudentLiveSessionsPage.tsx
// صفحة البث المباشر للطالب
// Student view for live sessions.

import { useEffect, useState } from 'react';
import { liveSessionService, LiveSession } from '@/services/liveSessionService';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Video, Calendar } from 'lucide-react';
import { format, isFuture, isPast } from 'date-fns';
import { arEG } from 'date-fns/locale';
import { toast } from 'sonner';

export default function StudentLiveSessionsPage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    liveSessionService.getSessions().then(data => {
      setSessions(data);
      setLoading(false);
    });
  }, []);

  const handleJoin = async (session: LiveSession) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (profile) {
        await liveSessionService.joinSession(session.id, profile.id);
      }
      
      window.open(session.stream_url, '_blank');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء الانضمام');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">حصصي المباشرة</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p>جاري التحميل...</p>
        ) : sessions.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-10">لا توجد حصص مجدولة حالياً</p>
        ) : (
          sessions.map((session) => {
            const isUpcoming = isFuture(new Date(session.start_time));
            const isEnded = isPast(new Date(session.end_time));
            const isLive = !isUpcoming && !isEnded;

            return (
              <Card key={session.id} className={isEnded ? 'opacity-75 bg-muted/30' : ''}>
                <CardHeader>
                  <CardTitle className="text-lg">{session.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{session.classroom?.name}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(session.start_time), 'PPP p', { locale: arEG })}</span>
                  </div>
                  
                  {isLive && (
                    <div className="flex items-center gap-2 text-sm text-red-500 font-bold animate-pulse">
                      <Video className="h-4 w-4" />
                      <span>مباشر الآن</span>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  {isLive ? (
                    <Button className="w-full bg-red-600 hover:bg-red-700" onClick={() => handleJoin(session)}>
                      انضم الآن
                    </Button>
                  ) : isUpcoming ? (
                    <Button disabled className="w-full" variant="outline">لم يبدأ بعد</Button>
                  ) : (
                    <Button disabled className="w-full" variant="secondary">انتهى</Button>
                  )}
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
