// src/pages/videos/VideoLessonsPage.tsx
// صفحة إدارة مكتبة الفيديو للمعلم
// Page for teachers to manage video library.

import { useEffect, useState } from 'react';
import { videoLessonService, VideoLesson } from '@/services/videoLessonService';
import { classroomService, Classroom } from '@/services/classroomService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlayCircle, Plus, Film } from 'lucide-react';
import { toast } from 'sonner';

export default function VideoLessonsPage() {
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    classroom_id: '',
    video_url: '',
    provider_type: 'youtube' as const
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [videosData, classroomsData] = await Promise.all([
        videoLessonService.getVideos(),
        classroomService.getClassrooms()
      ]);
      setVideos(videosData);
      setClassrooms(classroomsData as any);
    } catch (error) {
      console.error(error);
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await videoLessonService.createVideo(formData);
      toast.success('تم إضافة الفيديو بنجاح');
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('فشل إضافة الفيديو');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">مكتبة الفيديو</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة فيديو
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة درس مسجل</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>عنوان الدرس</Label>
                <Input 
                  required 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="مثال: شرح قانون نيوتن"
                />
              </div>
              
              <div className="space-y-2">
                <Label>الفصل الدراسي</Label>
                <Select onValueChange={val => setFormData({...formData, classroom_id: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفصل" />
                  </SelectTrigger>
                  <SelectContent>
                    {classrooms.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>رابط الفيديو</Label>
                <Input 
                  required 
                  value={formData.video_url}
                  onChange={e => setFormData({...formData, video_url: e.target.value})}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>

              <div className="space-y-2">
                <Label>المصدر</Label>
                <Select 
                  value={formData.provider_type}
                  onValueChange={(val: any) => setFormData({...formData, provider_type: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="vimeo">Vimeo</SelectItem>
                    <SelectItem value="custom">رابط مباشر</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full">حفظ</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p>جاري التحميل...</p>
        ) : videos.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-10">لا توجد فيديوهات مضافة</p>
        ) : (
          videos.map((video) => (
            <Card key={video.id} className="overflow-hidden">
              <div className="aspect-video bg-black/10 flex items-center justify-center">
                <Film className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <CardHeader className="p-4">
                <CardTitle className="text-base line-clamp-1">{video.title}</CardTitle>
                <p className="text-xs text-muted-foreground">{video.classroom?.name}</p>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Button variant="secondary" className="w-full gap-2" asChild>
                  <a href={video.video_url} target="_blank" rel="noopener noreferrer">
                    <PlayCircle className="h-4 w-4" />
                    مشاهدة
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
