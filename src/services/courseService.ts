import { supabase } from '@/lib/supabase';
import { Video } from './videoService';

export interface Course {
    id: string;
    title: string;
    description?: string;
    thumbnail_url?: string;
    teacher_id: string;
    is_published: boolean;
    created_at: string;
}

export interface Module {
    id: string;
    course_id: string;
    title: string;
    order: number;
    lessons?: Lesson[];
}

export interface Lesson {
    id: string;
    module_id: string;
    title: string;
    order: number;
    video?: Video;
}

export const courseService = {
    /**
     * Get all courses (filtered by RLS)
     * جلب جميع الدورات
     */
    async getCourses() {
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Course[];
    },

    /**
     * Get full course structure (Modules -> Lessons -> Video)
     * جلب هيكل الدورة بالكامل
     */
    async getCourseStructure(courseId: string) {
        const { data, error } = await supabase
            .from('modules')
            .select(`
        *,
        lessons (
          *,
          video:videos (*)
        )
      `)
            .eq('course_id', courseId)
            .order('order', { ascending: true });

        if (error) throw error;

        // Sort lessons by order
        const modules = data?.map(module => ({
            ...module,
            lessons: module.lessons?.sort((a: any, b: any) => a.order - b.order)
        }));

        return modules as Module[];
    },

    /**
     * Create a new course
     * إنشاء دورة جديدة
     */
    async createCourse(course: Omit<Course, 'id' | 'created_at' | 'teacher_id' | 'is_published'>) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: userProfile } = await supabase
            .from('users')
            .select('tenant_id')
            .eq('id', user.id)
            .single();

        if (!userProfile) throw new Error('User profile not found');

        const { data, error } = await supabase
            .from('courses')
            .insert({
                ...course,
                teacher_id: user.id,
                tenant_id: userProfile.tenant_id
            })
            .select()
            .single();

        if (error) throw error;
        return data as Course;
    },

    /**
     * Create a module
     * إنشاء وحدة
     */
    async createModule(module: Omit<Module, 'id' | 'lessons'>) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: userProfile } = await supabase
            .from('users')
            .select('tenant_id')
            .eq('id', user.id)
            .single();

        const { data, error } = await supabase
            .from('modules')
            .insert({
                ...module,
                tenant_id: userProfile?.tenant_id
            })
            .select()
            .single();

        if (error) throw error;
        return data as Module;
    },

    /**
     * Create a lesson
     * إنشاء درس
     */
    async createLesson(lesson: Omit<Lesson, 'id' | 'video'>) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: userProfile } = await supabase
            .from('users')
            .select('tenant_id')
            .eq('id', user.id)
            .single();

        const { data, error } = await supabase
            .from('lessons')
            .insert({
                ...lesson,
                tenant_id: userProfile?.tenant_id
            })
            .select()
            .single();

        if (error) throw error;
        return data as Lesson;
    }
};
