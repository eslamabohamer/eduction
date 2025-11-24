import { supabase } from '@/lib/supabase';
import { Video } from './videoService';
import { ServiceResponse } from '@/types/service';

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
    async getCourses(): Promise<ServiceResponse<Course[]>> {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                return { success: false, error: { message: error.message, code: error.code } };
            }
            return { success: true, data: data as Course[] };
        } catch (error: any) {
            return { success: false, error: { message: error.message } };
        }
    },

    /**
     * Get full course structure (Modules -> Lessons -> Video)
     * جلب هيكل الدورة بالكامل
     */
    async getCourseStructure(courseId: string): Promise<ServiceResponse<Module[]>> {
        try {
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

            if (error) {
                return { success: false, error: { message: error.message, code: error.code } };
            }

            // Sort lessons by order
            const modules = data?.map(module => ({
                ...module,
                lessons: module.lessons?.sort((a: any, b: any) => a.order - b.order)
            }));

            return { success: true, data: modules as Module[] };
        } catch (error: any) {
            return { success: false, error: { message: error.message } };
        }
    },

    /**
     * Create a new course
     * إنشاء دورة جديدة
     */
    async createCourse(course: Omit<Course, 'id' | 'created_at' | 'teacher_id' | 'is_published'>): Promise<ServiceResponse<Course>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: { message: 'Not authenticated' } };

            const { data: userProfile } = await supabase
                .from('users')
                .select('tenant_id')
                .eq('id', user.id)
                .single();

            if (!userProfile) return { success: false, error: { message: 'User profile not found' } };

            const { data, error } = await supabase
                .from('courses')
                .insert({
                    ...course,
                    teacher_id: user.id,
                    tenant_id: userProfile.tenant_id
                })
                .select()
                .single();

            if (error) {
                return { success: false, error: { message: error.message, code: error.code } };
            }
            return { success: true, data: data as Course };
        } catch (error: any) {
            return { success: false, error: { message: error.message } };
        }
    },

    /**
     * Create a module
     * إنشاء وحدة
     */
    async createModule(module: Omit<Module, 'id' | 'lessons'>): Promise<ServiceResponse<Module>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: { message: 'Not authenticated' } };

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

            if (error) {
                return { success: false, error: { message: error.message, code: error.code } };
            }
            return { success: true, data: data as Module };
        } catch (error: any) {
            return { success: false, error: { message: error.message } };
        }
    },

    /**
     * Create a lesson
     * إنشاء درس
     */
    async createLesson(lesson: Omit<Lesson, 'id' | 'video'>): Promise<ServiceResponse<Lesson>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: { message: 'Not authenticated' } };

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

            if (error) {
                return { success: false, error: { message: error.message, code: error.code } };
            }
            return { success: true, data: data as Lesson };
        } catch (error: any) {
            return { success: false, error: { message: error.message } };
        }
    }
};
