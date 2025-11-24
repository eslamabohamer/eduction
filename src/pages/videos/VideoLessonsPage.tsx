// src/pages/videos/VideoLessonsPage.tsx
// صفحة إدارة مكتبة الفيديو للمعلم
// Page for teachers to manage video library.

import { useEffect, useState } from 'react';
import { videoLessonService, VideoLesson } from '@/services/videoLessonService';
import { classroomService, Classroom } from '@/services/classroomService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlayCircle, Plus, Film, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function VideoLessonsPage() {
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [videoToEdit, setVideoToEdit] = useState<VideoLesson | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<VideoLesson | null>(null);

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
    setLoading(true);
    try {
      const [videosResponse, classroomsResponse] = await Promise.all([
        videoLessonService.getVideos(),
        classroomService.getClassrooms()
      ]);

      if (videosResponse.success && videosResponse.data) {
        setVideos(videosResponse.data);
      } else {
        console.error(videosResponse.error);
        toast.error('فشل تحميل الفيديوهات');
      }

      if (classroomsResponse.success && classroomsResponse.data) {
        setClassrooms(classroomsResponse.data);
      } else {
        console.error(classroomsResponse.error);
        toast.error('فشل تحميل الفصول');
      }
    } catch (error) {
      console.error(error);
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const response = await videoLessonService.createVideo(formData);

    if (response.success) {
      toast.success('تم إضافة الفيديو بنجاح');
      setIsDialogOpen(false);
      setFormData({ title: '', classroom_id: '', video_url: '', provider_type: 'youtube' });
      loadData();
    } else {
      console.error(response.error);
      toast.error(response.error?.message || 'فشل إضافة الفيديو');
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!videoToEdit) return;

    const response = await videoLessonService.updateVideo(videoToEdit.id, formData);

    if (response.success) {
      toast.success('تم تحديث الفيديو بنجاح');
      setIsEditDialogOpen(false);
      setVideoToEdit(null);
      loadData();
    } else {
      console.error(response.error);
      toast.error(response.error?.message || 'فشل تحديث الفيديو');
    }
  }

  async function handleDelete() {
    if (!videoToDelete) return;

    const response = await videoLessonService.deleteVideo(videoToDelete.id);

    if (response.success) {
      toast.success('تم حذف الفيديو بنجاح');
      setVideoToDelete(null);
      loadData();
    } else {
      console.error(response.error);
      toast.error(response.error?.message || 'فشل حذف الفيديو');
    }
  }

  const openEditDialog = (video: VideoLesson) => {
    setVideoToEdit(video);
    setFormData({
      title: video.title,
      classroom_id: video.classroom_id,
      video_url: video.video_url,
      provider_type: video.provider_type as any
    });
    setIsEditDialogOpen(true);
  };

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
              <DialogDescription>
                أدخل تفاصيل الفيديو الجديد أدناه.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>عنوان الدرس</Label>
                <Input
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="مثال: شرح قانون نيوتن"
                />
              </div>

              <div className="space-y-2">
                <Label>الفصل الدراسي</Label>
                <Select onValueChange={val => setFormData({ ...formData, classroom_id: val })}>
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
                  onChange={e => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>

              <div className="space-y-2">
                <Label>المصدر</Label>
                <Select
                  value={formData.provider_type}
                  onValueChange={(val: any) => setFormData({ ...formData, provider_type: val })}
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
            <Card key={video.id} className="overflow-hidden relative group">
              <div className="aspect-video bg-black/10 flex items-center justify-center relative">
                <Film className="h-10 w-10 text-muted-foreground/50" />
                <div className="absolute top-2 right-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="sr-only">فتح القائمة</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(video)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setVideoToDelete(video)} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الفيديو</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>عنوان الدرس</Label>
              <Input
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>الفصل الدراسي</Label>
              <Select
                value={formData.classroom_id}
                onValueChange={val => setFormData({ ...formData, classroom_id: val })}
              >
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
                onChange={e => setFormData({ ...formData, video_url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>المصدر</Label>
              <Select
                value={formData.provider_type}
                onValueChange={(val: any) => setFormData({ ...formData, provider_type: val })}
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

            <Button type="submit" className="w-full">حفظ التعديلات</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!videoToDelete} onOpenChange={(open) => !open && setVideoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد تماماً؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الفيديو <strong>{videoToDelete?.title}</strong>. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
