// src/pages/student/StudentVideosPage.tsx
// صفحة مكتبة الفيديو للطالب مع مشغل متقدم وتتبع
// Student view for video library with progress tracking.

import { useEffect, useState, useRef } from 'react';
import { videoLessonService, VideoLesson } from '@/services/videoLessonService';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlayCircle, Film, Clock } from 'lucide-react';
import ReactPlayer from 'react-player';
import { toast } from 'sonner';

export default function StudentVideosPage() {
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<VideoLesson | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  
  // Tracking
  const playerRef = useRef<ReactPlayer>(null);
  const [progress, setProgress] = useState(0);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('student_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        setStudentId(profile?.id || null);
      }

      const data = await videoLessonService.getVideos();
      setVideos(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const handleProgress = (state: { playedSeconds: number; played: number }) => {
    setProgress(state.played * 100);
    
    // Update DB every 10 seconds
    if (studentId && activeVideo && state.playedSeconds - lastUpdateRef.current > 10) {
      lastUpdateRef.current = state.playedSeconds;
      videoLessonService.updateProgress(activeVideo.id, studentId, Math.floor(state.playedSeconds));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">مكتبة الدروس</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p>جاري التحميل...</p>
        ) : videos.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-10">لا توجد دروس مسجلة حالياً</p>
        ) : (
          videos.map((video) => (
            <Card key={video.id} className="overflow-hidden hover:shadow-md transition-shadow group cursor-pointer" onClick={() => setActiveVideo(video)}>
              <div className="aspect-video bg-black/90 flex items-center justify-center relative">
                <Film className="h-12 w-12 text-muted-foreground/30" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <PlayCircle className="h-16 w-16 text-white drop-shadow-lg transform group-hover:scale-110 transition-transform" />
                </div>
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                   <Clock className="h-3 w-3" />
                   <span>مشاهدة</span>
                </div>
              </div>
              <CardHeader className="p-4">
                <CardTitle className="text-base line-clamp-1">{video.title}</CardTitle>
                <p className="text-xs text-muted-foreground">{video.classroom?.name}</p>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {/* Video Player Dialog */}
      <Dialog open={!!activeVideo} onOpenChange={(open) => !open && setActiveVideo(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black">
          <DialogHeader className="p-4 bg-background absolute top-0 left-0 right-0 z-10 opacity-0 hover:opacity-100 transition-opacity">
            <DialogTitle>{activeVideo?.title}</DialogTitle>
          </DialogHeader>
          
          <div className="aspect-video w-full relative">
            {activeVideo && (
              <ReactPlayer
                ref={playerRef}
                url={activeVideo.video_url}
                width="100%"
                height="100%"
                controls
                playing
                onProgress={handleProgress}
                config={{
                  youtube: { playerVars: { showinfo: 1 } }
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
