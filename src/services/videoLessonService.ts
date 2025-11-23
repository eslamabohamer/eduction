// src/services/videoLessonService.ts
// خدمة إدارة الدروس المسجلة
// Service for managing video lessons and tracking views.

import { supabase } from '@/lib/supabase';

export interface VideoLesson {
  id: string;
  title: string;
  description?: string;
  classroom_id: string;
  video_url: string;
  provider_type: 'youtube' | 'vimeo' | 'custom';
  created_at: string;
  classroom?: {
    name: string;
  };
}

export const videoLessonService = {
  async getVideos() {
    const { data, error } = await supabase
      .from('video_lessons')
      .select(`
        *,
        classroom:classrooms(name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as VideoLesson[];
  },

  async createVideo(data: Omit<VideoLesson, 'id' | 'created_at' | 'classroom'>) {
    const { data: result, error } = await supabase
      .from('video_lessons')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  },

  /**
   * Track video progress
   */
  async updateProgress(videoId: string, studentId: string, secondsWatched: number) {
    // Upsert view record
    const { error } = await supabase
      .from('video_views')
      .upsert({
        video_lesson_id: videoId,
        student_id: studentId,
        watch_seconds: secondsWatched,
        last_updated: new Date().toISOString()
      }, { onConflict: 'video_lesson_id, student_id' });

    if (error) console.error('Failed to track video progress', error);
  }
};
