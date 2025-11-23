// src/App.tsx
// إضافة مسارات الواجبات والتقويم
// Add Homework and Calendar routes.

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import StudentsPage from '@/pages/students/StudentsPage';
import ClassroomsPage from '@/pages/classrooms/ClassroomsPage';
import ClassroomDetails from '@/pages/classrooms/ClassroomDetails';
import ExamsPage from '@/pages/exams/ExamsPage';
import CreateExam from '@/pages/exams/CreateExam';
import StudentExamsPage from '@/pages/student/StudentExamsPage';
import TakeExamPage from '@/pages/student/TakeExamPage';
import LiveSessionsPage from '@/pages/live-sessions/LiveSessionsPage';
import VideoLessonsPage from '@/pages/videos/VideoLessonsPage';
import StudentLiveSessionsPage from '@/pages/student/StudentLiveSessionsPage';
import StudentVideosPage from '@/pages/student/StudentVideosPage';
import HomeworksPage from '@/pages/homework/HomeworksPage';
import StudentHomeworksPage from '@/pages/student/StudentHomeworksPage';
import CalendarPage from '@/pages/calendar/CalendarPage';
import { Layout } from '@/components/Layout';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <Layout>
                <Dashboard />
              </Layout>
            }
          />
          <Route
            path="/calendar"
            element={
              <Layout>
                <CalendarPage />
              </Layout>
            }
          />
          
          {/* Teacher Routes */}
          <Route
            path="/students"
            element={
              <Layout>
                <StudentsPage />
              </Layout>
            }
          />
          <Route
            path="/classrooms"
            element={
              <Layout>
                <ClassroomsPage />
              </Layout>
            }
          />
          <Route
            path="/classrooms/:id"
            element={
              <Layout>
                <ClassroomDetails />
              </Layout>
            }
          />
          <Route
            path="/exams"
            element={
              <Layout>
                <ExamsPage />
              </Layout>
            }
          />
          <Route
            path="/exams/create"
            element={
              <Layout>
                <CreateExam />
              </Layout>
            }
          />
          <Route
            path="/live-sessions"
            element={
              <Layout>
                <LiveSessionsPage />
              </Layout>
            }
          />
          <Route
            path="/videos"
            element={
              <Layout>
                <VideoLessonsPage />
              </Layout>
            }
          />
          <Route
            path="/homework"
            element={
              <Layout>
                <HomeworksPage />
              </Layout>
            }
          />
          
          {/* Student Routes */}
          <Route
            path="/my-exams"
            element={
              <Layout>
                <StudentExamsPage />
              </Layout>
            }
          />
          <Route
            path="/exams/:id/take"
            element={
              <Layout>
                <TakeExamPage />
              </Layout>
            }
          />
          <Route
            path="/my-live-sessions"
            element={
              <Layout>
                <StudentLiveSessionsPage />
              </Layout>
            }
          />
          <Route
            path="/my-videos"
            element={
              <Layout>
                <StudentVideosPage />
              </Layout>
            }
          />
          <Route
            path="/my-homework"
            element={
              <Layout>
                <StudentHomeworksPage />
              </Layout>
            }
          />
        </Routes>
      </Router>
      <Toaster position="top-left" dir="rtl" />
    </AuthProvider>
  );
}

export default App;
