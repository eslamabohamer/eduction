// src/App.tsx
// Updated to include Admin Routes

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import StudentsPage from '@/pages/students/StudentsPage';
import StudentDetailsPage from '@/pages/students/StudentDetailsPage';
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
import CourseManagerPage from '@/pages/teacher/CourseManagerPage';
import StudentHomeworksPage from '@/pages/student/StudentHomeworksPage';
import CalendarPage from '@/pages/calendar/CalendarPage';
import SecretaryDashboard from '@/pages/secretary/SecretaryDashboard';
import BulkNotificationsPage from '@/pages/secretary/BulkNotificationsPage';
import FinanceLayout from '@/pages/finance/FinanceLayout';
import FinanceDashboard from '@/pages/finance/FinanceDashboard';
import FeeManagementPage from '@/pages/finance/FeeManagementPage';
import SettingsPage from '@/pages/settings/SettingsPage';
import StudentProfilePage from '@/pages/student/StudentProfilePage';
import ParentDashboard from '@/pages/parent/ParentDashboard';
import ParentChildDetails from '@/pages/parent/ParentChildDetails';
import ParentMessages from '@/pages/parent/ParentMessages';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import TenantsPage from '@/pages/admin/TenantsPage';
import GlobalUsersPage from '@/pages/admin/GlobalUsersPage';
import StudentDashboard from '@/pages/student/StudentDashboard';
import StudentGradesPage from '@/pages/student/StudentGradesPage';
import StudentAttendancePage from '@/pages/student/StudentAttendancePage';
import StudentNotificationsPage from '@/pages/student/StudentNotificationsPage';
import StudentCourseView from '@/pages/student/StudentCourseView';
import { SecretaryMonitoringPage } from '@/pages/teacher/SecretaryMonitoringPage';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';

// Wrapper to route based on role
function DashboardRouter() {
  const { user } = useAuth();
  if (user?.role === 'Admin') return <AdminDashboard />;
  if (user?.role === 'Secretary') return <SecretaryDashboard />;
  if (user?.role === 'Parent') return <ParentDashboard />;
  if (user?.role === 'Student') return <StudentDashboard />;
  return <Dashboard />;
}

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
                <DashboardRouter />
              </Layout>
            }
          />
          <Route
            path="/settings"
            element={
              <Layout>
                <SettingsPage />
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

          {/* Shared Teacher & Secretary Routes (Management) */}
          <Route
            path="/students"
            element={
              <Layout>
                <StudentsPage />
              </Layout>
            }
          />
          <Route
            path="/students/:id"
            element={
              <Layout>
                <StudentDetailsPage />
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

          {/* Scheduling Tools */}
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
          <Route
            path="/courses"
            element={
              <Layout>
                <CourseManagerPage />
              </Layout>
            }
          />
          <Route
            path="/teacher/secretary-monitoring"
            element={
              <Layout>
                <SecretaryMonitoringPage />
              </Layout>
            }
          />

          {/* Secretary Specific Routes */}
          <Route
            path="/secretary/notifications"
            element={
              <Layout>
                <BulkNotificationsPage />
              </Layout>
            }
          />

          {/* Finance Module Routes */}
          <Route path="/finance" element={<Layout><FinanceLayout /></Layout>}>
            <Route index element={<FinanceDashboard />} />
            <Route path="fees" element={<FeeManagementPage />} />
            <Route path="transactions" element={<div className="p-8 text-center">صفحة المعاملات (قيد التطوير)</div>} />
            <Route path="reports" element={<div className="p-8 text-center">صفحة التقارير (قيد التطوير)</div>} />
          </Route>

          {/* Student Routes */}
          <Route
            path="/my-profile"
            element={
              <Layout>
                <StudentProfilePage />
              </Layout>
            }
          />
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
          <Route
            path="/my-grades"
            element={
              <Layout>
                <StudentGradesPage />
              </Layout>
            }
          />
          <Route
            path="/my-attendance"
            element={
              <Layout>
                <StudentAttendancePage />
              </Layout>
            }
          />
          <Route
            path="/my-notifications"
            element={
              <Layout>
                <StudentNotificationsPage />
              </Layout>
            }
          />
          <Route
            path="/my-courses"
            element={
              <Layout>
                <StudentCourseView />
              </Layout>
            }
          />

          {/* Parent Routes */}
          <Route
            path="/parent/dashboard"
            element={
              <Layout>
                <ParentDashboard />
              </Layout>
            }
          />
          <Route
            path="/parent/child/:id"
            element={
              <Layout>
                <ParentChildDetails />
              </Layout>
            }
          />
          <Route
            path="/parent/messages"
            element={
              <Layout>
                <ParentMessages />
              </Layout>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <Layout>
                <AdminDashboard />
              </Layout>
            }
          />
          <Route
            path="/admin/tenants"
            element={
              <Layout>
                <TenantsPage />
              </Layout>
            }
          />
          <Route
            path="/admin/users"
            element={
              <Layout>
                <GlobalUsersPage />
              </Layout>
            }
          />
          {/* Placeholder for billing, can share page or create new */}
          <Route
            path="/admin/billing"
            element={
              <Layout>
                <div className="p-8 text-center">صفحة الاشتراكات (قيد التطوير)</div>
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
