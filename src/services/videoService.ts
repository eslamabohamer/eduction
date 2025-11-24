import { supabase } from '@/lib/supabase';
import { ServiceResponse } from '@/types/service';

export interface Video {
    id: string;
    lesson_id: string;
    tenant_id: string;
    title: string;
    description?: string;
    storage_path: string;
    duration: number;
    is_public: boolean;
    created_at: string;
}

export interface VideoProgress {
    id: string;
    user_id: string;
    video_id: string;
    progress_seconds: number;
    is_completed: boolean;
    last_watched_at: string;
}

export const videoService = {
    /**
     * Upload video to Supabase Storage
     * رفع الفيديو إلى Supabase Storage
     */
    async uploadVideo(file: File, path: string): Promise<ServiceResponse<any>> {
        try {
            const { data, error } = await supabase.storage
                .from('course_videos')
                .upload(path, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                return { success: false, error: { message: error.message } };
            }
            return { success: true, data };
        } catch (error: any) {
            return { success: false, error: { message: error.message } };
        }
    },

    /**
     * Get signed URL for video playback
     * الحصول على رابط موقع للفيديو
     */
    async getVideoUrl(storagePath: string): Promise<ServiceResponse<string>> {
        try {
            const { data, error } = await supabase.storage
                .from('course_videos')
                .createSignedUrl(storagePath, 3600); // Valid for 1 hour

            if (error) {
                return { success: false, error: { message: error.message } };
            }
            return { success: true, data: data.signedUrl };
        } catch (error: any) {
            return { success: false, error: { message: error.message } };
        }
    },

    /**
     * Create video record in database
     * إنشاء سجل فيديو في قاعدة البيانات
     */
    async createVideoRecord(video: Omit<Video, 'id' | 'created_at' | 'tenant_id'>): Promise<ServiceResponse<Video>> {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) return { success: false, error: { message: 'Not authenticated' } };

            // Get tenant_id
            const { data: userProfile } = await supabase
                .from('users')
                .select('tenant_id')
                .eq('id', userData.user.id)
                .single();

            if (!userProfile) return { success: false, error: { message: 'User profile not found' } };

            const { data, error } = await supabase
                .from('videos')
                .insert({
                    ...video,
                    tenant_id: userProfile.tenant_id
                })
                .select()
                .single();

            if (error) {
                return { success: false, error: { message: error.message, code: error.code } };
            }
            return { success: true, data: data as Video };
        } catch (error: any) {
            return { success: false, error: { message: error.message } };
        }
    },

    /**
     * Track video progress
     * تتبع تقدم مشاهدة الفيديو
     */
    async updateProgress(videoId: string, secondsWatched: number, isCompleted: boolean = false): Promise<ServiceResponse<void>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: { message: 'Not authenticated' } };

            // Get tenant_id
            const { data: userProfile } = await supabase
                .from('users')
                .select('tenant_id')
                .eq('id', user.id)
                .single();

            if (!userProfile) return { success: false, error: { message: 'User profile not found' } };

            const { error } = await supabase
                .from('video_progress')
                .upsert({
                    user_id: user.id,
                    video_id: videoId,
                    tenant_id: userProfile.tenant_id,
                    progress_seconds: secondsWatched,
                    is_completed: isCompleted,
                    last_watched_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id, video_id'
                });

            if (error) {
                console.error('Failed to update progress', error);
                return { success: false, error: { message: error.message, code: error.code } };
            }
            return { success: true };
        } catch (error: any) {
            return { success: false, error: { message: error.message } };
        }
    },

    /**
     * Get user's progress for a video
     * الحصول على تقدم المستخدم لفيديو معين
     */
    async getProgress(videoId: string): Promise<ServiceResponse<VideoProgress | null>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: true, data: null };

            const { data, error } = await supabase
                .from('video_progress')
                .select('*')
                .eq('user_id', user.id)
                .eq('video_id', videoId)
                .single();

            if (error && error.code !== 'PGRST116') {
                return { success: false, error: { message: error.message, code: error.code } };
            }
            return { success: true, data: data as VideoProgress | null };
        } catch (error: any) {
            return { success: false, error: { message: error.message } };
        }
    }
};
