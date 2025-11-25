import { supabase } from '@/lib/supabase';
import { format, addDays } from 'date-fns';

export interface DashboardStats {
  completedAssignments: number;
  pendingAssignments: number;
  attendanceRate: number;
  averageGrade: number;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  type: 'exam' | 'live_session' | 'homework';
  date: string;
  courseName?: string;
}

export const studentDashboardService = {
  async getStats(studentId: string): Promise<DashboardStats> {
    // 1. Assignments Stats
    const { data: submissions } = await supabase
      .from('homework_submissions')
      .select('grade')
      .eq('student_id', studentId);

    const { count: totalHomeworks } = await supabase
      .from('homework')
      .select('*', { count: 'exact', head: true });

    const completed = submissions?.length || 0;
    const pending = (totalHomeworks || 0) - completed;
    
    // Calculate Average Grade
    const gradedSubmissions = submissions?.filter(s => s.grade !== null) || [];
    const averageGrade = gradedSubmissions.length > 0
      ? gradedSubmissions.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedSubmissions.length
      : 0;

    // 2. Attendance Stats (Simplified for now)
    const { count: attendanceCount } = await supabase
      .from('live_session_attendance')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId);
      
    // Assuming total sessions could be fetched, for now we return raw count or a mock rate
    // In a real app, you'd compare attendanceCount vs total sessions for their class
    
    return {
      completedAssignments: completed,
      pendingAssignments: pending > 0 ? pending : 0,
      attendanceRate: attendanceCount || 0, // This would be a percentage in a full implementation
      averageGrade: parseFloat(averageGrade.toFixed(1))
    };
  },

  async getUpcomingSchedule(classroomId: string): Promise<UpcomingEvent[]> {
    const now = new Date().toISOString();
    const nextWeek = addDays(new Date(), 7).toISOString();

    // Fetch Exams
    const { data: exams } = await supabase
      .from('exams')
      .select('id, title, start_time, classroom(name)')
      .eq('classroom_id', classroomId)
      .gte('start_time', now)
      .lte('start_time', nextWeek)
      .order('start_time');

    // Fetch Live Sessions
    const { data: sessions } = await supabase
      .from('live_sessions')
      .select('id, title, start_time, classroom(name)')
      .eq('classroom_id', classroomId)
      .gte('start_time', now)
      .lte('start_time', nextWeek)
      .order('start_time');

    // Fetch Homework
    const { data: homeworks } = await supabase
      .from('homework')
      .select('id, title, due_date, classroom(name)')
      .eq('classroom_id', classroomId)
      .gte('due_date', now)
      .lte('due_date', nextWeek)
      .order('due_date');

    const events: UpcomingEvent[] = [
      ...(exams?.map(e => ({
        id: e.id,
        title: e.title,
        type: 'exam' as const,
        date: e.start_time,
        courseName: (e.classroom as any)?.name
      })) || []),
      ...(sessions?.map(s => ({
        id: s.id,
        title: s.title,
        type: 'live_session' as const,
        date: s.start_time,
        courseName: (s.classroom as any)?.name
      })) || []),
      ...(homeworks?.map(h => ({
        id: h.id,
        title: h.title,
        type: 'homework' as const,
        date: h.due_date,
        courseName: (h.classroom as any)?.name
      })) || [])
    ];

    // Sort all events by date
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
};
