import { useState, useEffect } from 'react';
import { courseService, Course, Module } from '@/services/courseService';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PlayCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function StudentCourseView() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [modules, setModules] = useState<Module[]>([]);
    const [activeVideo, setActiveVideo] = useState<{
        id: string;
        path: string;
        title: string;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCourses();
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            loadCourseStructure(selectedCourse.id);
            setActiveVideo(null);
        }
    }, [selectedCourse]);

    async function loadCourses() {
        try {
            const data = await courseService.getCourses();
            // Filter for published courses only (though RLS should handle this too)
            setCourses(data.filter(c => c.is_published));
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

    return (
        <div className="container mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold">دوراتي التدريبية</h1>

            {!selectedCourse ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {courses.map(course => (
                        <Card key={course.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedCourse(course)}>
                            <div className="aspect-video bg-muted relative">
                                {course.thumbnail_url ? (
                                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover rounded-t-lg" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                                        <PlayCircle className="h-12 w-12" />
                                    </div>
                                )}
                            </div>
                            <CardHeader>
                                <CardTitle>{course.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {course.description || 'لا يوجد وصف'}
                                </p>
                                <Button className="w-full mt-4">ابدأ المشاهدة</Button>
                            </CardContent>
                        </Card>
                    ))}
                    {courses.length === 0 && !loading && (
                        <div className="col-span-3 text-center py-12 text-muted-foreground">
                            لا توجد دورات متاحة حالياً
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Video Player Area */}
                    <div className="lg:col-span-2 space-y-4">
                        <Button variant="ghost" onClick={() => setSelectedCourse(null)} className="mb-2">
                            &larr; العودة للدورات
                        </Button>

                        {activeVideo ? (
                            <div className="space-y-4">
                                <VideoPlayer
                                    videoId={activeVideo.id}
                                    storagePath={activeVideo.path}
                                    title={activeVideo.title}
                                    onComplete={() => toast.success('تم إكمال الفيديو!')}
                                />
                                <h2 className="text-xl font-semibold">{activeVideo.title}</h2>
                            </div>
                        ) : (
                            <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                                <PlayCircle className="h-16 w-16 mb-4 opacity-50" />
                                <p>اختر درساً من القائمة لبدء المشاهدة</p>
                            </div>
                        )}
                    </div>

                    {/* Course Content Sidebar */}
                    <div className="lg:col-span-1">
                        <Card className="h-full max-h-[calc(100vh-100px)] overflow-y-auto">
                            <CardHeader>
                                <CardTitle className="text-lg">{selectedCourse.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Accordion type="single" collapsible className="w-full">
                                    {modules.map(module => (
                                        <AccordionItem key={module.id} value={module.id}>
                                            <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/50">
                                                <span className="text-sm font-medium">{module.title}</span>
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-0">
                                                <div className="divide-y">
                                                    {module.lessons?.map(lesson => (
                                                        <button
                                                            key={lesson.id}
                                                            disabled={!lesson.video}
                                                            onClick={() => {
                                                                if (lesson.video) {
                                                                    setActiveVideo({
                                                                        id: lesson.video.id,
                                                                        path: lesson.video.storage_path,
                                                                        title: lesson.title
                                                                    });
                                                                }
                                                            }}
                                                            className={`w-full flex items-center gap-3 p-3 text-right transition-colors ${activeVideo?.id === lesson.video?.id
                                                                ? 'bg-primary/10 text-primary'
                                                                : 'hover:bg-muted'
                                                                } ${!lesson.video ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            {lesson.video ? (
                                                                <PlayCircle className="h-4 w-4 shrink-0" />
                                                            ) : (
                                                                <Lock className="h-4 w-4 shrink-0" />
                                                            )}
                                                            <span className="text-sm truncate">{lesson.title}</span>
                                                        </button>
                                                    ))}
                                                    {(!module.lessons || module.lessons.length === 0) && (
                                                        <div className="p-3 text-xs text-muted-foreground text-center">
                                                            لا توجد دروس
                                                        </div>
                                                    )}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
