// src/pages/student/StudentVideosPage.tsx
// صفحة مكتبة الفيديو للطالب
// Student view for video library.

import { useEffect, useState } from 'react';
import { videoLessonService, VideoLesson } from '@/services/videoLessonService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayCircle, Film } from 'lucide-react';

export default function StudentVideosPage() {
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    videoLessonService.getVideos().then(data => {
      setVideos(data);
      setLoading(false);
    });
  }, []);

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
            <Card key={video.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-video bg-black/5 flex items-center justify-center relative group">
                <Film className="h-12 w-12 text-muted-foreground/30" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <PlayCircle className="h-12 w-12 text-white" />
                </div>
              </div>
              <CardHeader className="p-4">
                <CardTitle className="text-base line-clamp-1">{video.title}</CardTitle>
                <p className="text-xs text-muted-foreground">{video.classroom?.name}</p>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Button className="w-full" asChild>
                  <a href={video.video_url} target="_blank" rel="noopener noreferrer">
                    مشاهدة الدرس
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
