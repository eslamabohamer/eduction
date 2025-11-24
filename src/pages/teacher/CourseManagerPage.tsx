import { useState, useEffect } from 'react';
import { courseService, Course, Module } from '@/services/courseService';
import { videoService } from '@/services/videoService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Upload, FileVideo, PlayCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CourseManagerPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);

    // Dialog states
    const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
    const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
    const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
    const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);

    // Form states
    const [newCourseTitle, setNewCourseTitle] = useState('');
    const [newModuleTitle, setNewModuleTitle] = useState('');
    const [newLessonTitle, setNewLessonTitle] = useState('');
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

    // Video Upload State
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadCourses();
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            loadCourseStructure(selectedCourse.id);
        }
    }, [selectedCourse]);

    async function loadCourses() {
        try {
            const data = await courseService.getCourses();
            setCourses(data);
        } catch (error) {
            toast.error('فشل تحميل الدورات');
        } finally {
            setLoading(false);
        }
    }

    async function loadCourseStructure(courseId: string) {
        try {
            const data = await courseService.getCourseStructure(courseId);
            setModules(data);
        } catch (error) {
            toast.error('فشل تحميل محتوى الدورة');
        }
    }

    async function handleCreateCourse() {
        try {
            await courseService.createCourse({
                title: newCourseTitle,
                description: '',
                thumbnail_url: ''
            });
            toast.success('تم إنشاء الدورة بنجاح');
            setIsCourseDialogOpen(false);
            setNewCourseTitle('');
            loadCourses();
        } catch (error) {
            toast.error('فشل إنشاء الدورة');
        }
    }

    async function handleCreateModule() {
        if (!selectedCourse) return;
        try {
            await courseService.createModule({
                course_id: selectedCourse.id,
                title: newModuleTitle,
                order: modules.length + 1
            });
            toast.success('تم إضافة الوحدة');
            setIsModuleDialogOpen(false);
            setNewModuleTitle('');
            loadCourseStructure(selectedCourse.id);
        } catch (error) {
            toast.error('فشل إضافة الوحدة');
        }
    }

    async function handleCreateLesson() {
        if (!selectedModuleId) return;
        try {
            // Find current module to get lesson count for order
            const module = modules.find(m => m.id === selectedModuleId);
            const order = (module?.lessons?.length || 0) + 1;

            await courseService.createLesson({
                module_id: selectedModuleId,
                title: newLessonTitle,
                order
            });
            toast.success('تم إضافة الدرس');
            setIsLessonDialogOpen(false);
            setNewLessonTitle('');
            if (selectedCourse) loadCourseStructure(selectedCourse.id);
        } catch (error) {
            toast.error('فشل إضافة الدرس');
        }
    }

    async function handleUploadVideo() {
        if (!selectedLessonId || !videoFile) return;

        try {
            setUploading(true);
            const fileExt = videoFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${selectedLessonId}/${fileName}`;

            // 1. Upload to Storage
            await videoService.uploadVideo(videoFile, filePath);

            // 2. Create DB Record
            await videoService.createVideoRecord({
                lesson_id: selectedLessonId,
                title: videoFile.name,
                storage_path: filePath,
                duration: 0, // Should be extracted ideally
                is_public: false
            });

            toast.success('تم رفع الفيديو بنجاح');
            setIsVideoDialogOpen(false);
            setVideoFile(null);
            if (selectedCourse) loadCourseStructure(selectedCourse.id);
        } catch (error) {
            console.error(error);
            toast.error('فشل رفع الفيديو');
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">إدارة الدورات التدريبية</h1>
                <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="ml-2 h-4 w-4" />
                            دورة جديدة
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>إنشاء دورة جديدة</DialogTitle>
                            <DialogDescription>أدخل عنوان الدورة الجديدة</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>عنوان الدورة</Label>
                                <Input value={newCourseTitle} onChange={e => setNewCourseTitle(e.target.value)} />
                            </div>
                            <Button onClick={handleCreateCourse} className="w-full">إنشاء</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Course List */}
                <Card className="md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg">الدورات</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {courses.map(course => (
                            <Button
                                key={course.id}
                                variant={selectedCourse?.id === course.id ? "default" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => setSelectedCourse(course)}
                            >
                                {course.title}
                            </Button>
                        ))}
                    </CardContent>
                </Card>

                {/* Course Content Editor */}
                <Card className="md:col-span-3 min-h-[500px]">
                    <CardHeader className="flex flex-row justify-between items-center">
                        <CardTitle>{selectedCourse ? selectedCourse.title : 'اختر دورة للبدء'}</CardTitle>
                        {selectedCourse && (
                            <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Plus className="ml-2 h-4 w-4" />
                                        وحدة جديدة
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>إضافة وحدة جديدة</DialogTitle>
                                        <DialogDescription>أدخل عنوان الوحدة</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 mt-4">
                                        <div className="space-y-2">
                                            <Label>عنوان الوحدة</Label>
                                            <Input value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)} />
                                        </div>
                                        <Button onClick={handleCreateModule} className="w-full">إضافة</Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}
                    </CardHeader>
                    <CardContent>
                        {selectedCourse && (
                            <Accordion type="single" collapsible className="w-full">
                                {modules.map(module => (
                                    <AccordionItem key={module.id} value={module.id}>
                                        <AccordionTrigger className="hover:no-underline">
                                            <div className="flex justify-between w-full ml-4">
                                                <span>{module.title}</span>
                                                <Dialog open={isLessonDialogOpen} onOpenChange={setIsLessonDialogOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedModuleId(module.id);
                                                            }}
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>إضافة درس جديد</DialogTitle>
                                                            <DialogDescription>أدخل عنوان الدرس</DialogDescription>
                                                        </DialogHeader>
                                                        <div className="space-y-4 mt-4">
                                                            <div className="space-y-2">
                                                                <Label>عنوان الدرس</Label>
                                                                <Input value={newLessonTitle} onChange={e => setNewLessonTitle(e.target.value)} />
                                                            </div>
                                                            <Button onClick={handleCreateLesson} className="w-full">إضافة</Button>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="space-y-2 pt-2">
                                            {module.lessons?.map(lesson => (
                                                <div key={lesson.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                                                    <div className="flex items-center gap-3">
                                                        <PlayCircle className="h-5 w-5 text-muted-foreground" />
                                                        <span>{lesson.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {lesson.video ? (
                                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                                                                <FileVideo className="h-3 w-3" />
                                                                فيديو مرفق
                                                            </span>
                                                        ) : (
                                                            <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
                                                                <DialogTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => setSelectedLessonId(lesson.id)}
                                                                    >
                                                                        <Upload className="h-4 w-4 ml-2" />
                                                                        رفع فيديو
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent>
                                                                    <DialogHeader>
                                                                        <DialogTitle>رفع فيديو للدرس: {lesson.title}</DialogTitle>
                                                                        <DialogDescription>اختر ملف الفيديو للرفع</DialogDescription>
                                                                    </DialogHeader>
                                                                    <div className="space-y-4 mt-4">
                                                                        <div className="space-y-2">
                                                                            <Label>ملف الفيديو</Label>
                                                                            <Input
                                                                                type="file"
                                                                                accept="video/*"
                                                                                onChange={e => setVideoFile(e.target.files?.[0] || null)}
                                                                            />
                                                                        </div>
                                                                        <Button
                                                                            onClick={handleUploadVideo}
                                                                            className="w-full"
                                                                            disabled={!videoFile || uploading}
                                                                        >
                                                                            {uploading ? (
                                                                                <>
                                                                                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                                                                    جاري الرفع...
                                                                                </>
                                                                            ) : 'رفع الفيديو'}
                                                                        </Button>
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {(!module.lessons || module.lessons.length === 0) && (
                                                <div className="text-center text-sm text-muted-foreground py-4">
                                                    لا توجد دروس في هذه الوحدة
                                                </div>
                                            )}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
