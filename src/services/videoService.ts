import { supabase } from '@/lib/supabase';

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
    async uploadVideo(file: File, path: string) {
        const { data, error } = await supabase.storage
            .from('course_videos')
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;
        return data;
    },

    /**
     * Get signed URL for video playback
     * الحصول على رابط موقع للفيديو
     */
    async getVideoUrl(storagePath: string) {
        const { data, error } = await supabase.storage
            .from('course_videos')
            .createSignedUrl(storagePath, 3600); // Valid for 1 hour

        if (error) throw error;
        return data.signedUrl;
    },

    /**
     * Create video record in database
     * إنشاء سجل فيديو في قاعدة البيانات
     */
    async createVideoRecord(video: Omit<Video, 'id' | 'created_at' | 'tenant_id'>) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Not authenticated');

        // Get tenant_id
        const { data: userProfile } = await supabase
            .from('users')
            .select('tenant_id')
            .eq('id', userData.user.id)
            .single();

        if (!userProfile) throw new Error('User profile not found');

        const { data, error } = await supabase
            .from('videos')
            .insert({
                ...video,
                tenant_id: userProfile.tenant_id
            })
            .select()
            .single();

        if (error) throw error;
        return data as Video;
    },

    /**
     * Track video progress
     * تتبع تقدم مشاهدة الفيديو
     */
    async updateProgress(videoId: string, secondsWatched: number, isCompleted: boolean = false) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get tenant_id
        const { data: userProfile } = await supabase
            .from('users')
            .select('tenant_id')
            .eq('id', user.id)
            .single();

        if (!userProfile) return;

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

        if (error) console.error('Failed to update progress', error);
    },

    /**
     * Get user's progress for a video
     * الحصول على تقدم المستخدم لفيديو معين
     */
    async getProgress(videoId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('video_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('video_id', videoId)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // Ignore not found
        return data as VideoProgress | null;
    }
};
