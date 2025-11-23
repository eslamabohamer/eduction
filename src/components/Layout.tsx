// src/components/Layout.tsx
// تحديث التخطيط لإضافة الإشعارات وروابط الواجبات والتقويم
// Updated Layout with Notifications and new links.

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, BookOpen, GraduationCap, Users, Video, Film, CalendarDays, BookCheck } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { NotificationsPopover } from '@/components/layout/NotificationsPopover';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex h-screen items-center justify-center">جاري التحميل...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const NavItems = () => (
    <nav className="flex flex-col gap-2 p-4">
      <div className="mb-6 px-2">
        <h1 className="text-xl font-bold text-primary">منصتي التعليمية</h1>
        <p className="text-sm text-muted-foreground">{user.name}</p>
        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors bg-secondary text-secondary-foreground">
          {user.role === 'Teacher' ? 'معلم' : user.role === 'Student' ? 'طالب' : user.role}
        </span>
      </div>
      
      <Link to="/">
        <Button variant={location.pathname === '/' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
           الرئيسية
        </Button>
      </Link>

      <Link to="/calendar">
        <Button variant={location.pathname === '/calendar' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
           <CalendarDays className="h-4 w-4" />
           التقويم
        </Button>
      </Link>
      
      {/* Teacher Links */}
      {user.role === 'Teacher' && (
        <>
          <Link to="/students">
            <Button variant={location.pathname.startsWith('/students') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
              <Users className="h-4 w-4" />
              الطلاب
            </Button>
          </Link>
          <Link to="/classrooms">
            <Button variant={location.pathname.startsWith('/classrooms') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
              <BookOpen className="h-4 w-4" />
              الفصول الدراسية
            </Button>
          </Link>
          <Link to="/homework">
            <Button variant={location.pathname.startsWith('/homework') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
              <BookCheck className="h-4 w-4" />
              الواجبات
            </Button>
          </Link>
          <Link to="/exams">
            <Button variant={location.pathname.startsWith('/exams') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
              <GraduationCap className="h-4 w-4" />
              الاختبارات
            </Button>
          </Link>
          <Link to="/live-sessions">
            <Button variant={location.pathname.startsWith('/live-sessions') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
              <Video className="h-4 w-4" />
              البث المباشر
            </Button>
          </Link>
          <Link to="/videos">
            <Button variant={location.pathname.startsWith('/videos') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
              <Film className="h-4 w-4" />
              مكتبة الفيديو
            </Button>
          </Link>
        </>
      )}

      {/* Student Links */}
      {user.role === 'Student' && (
        <>
           <Link to="/my-exams">
            <Button variant={location.pathname.startsWith('/my-exams') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
              <GraduationCap className="h-4 w-4" />
              اختباراتي
            </Button>
          </Link>
          <Link to="/my-homework">
            <Button variant={location.pathname.startsWith('/my-homework') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
              <BookCheck className="h-4 w-4" />
              واجباتي
            </Button>
          </Link>
          <Link to="/my-live-sessions">
            <Button variant={location.pathname.startsWith('/my-live-sessions') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
              <Video className="h-4 w-4" />
              حصص مباشرة
            </Button>
          </Link>
          <Link to="/my-videos">
            <Button variant={location.pathname.startsWith('/my-videos') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
              <Film className="h-4 w-4" />
              مكتبة الدروس
            </Button>
          </Link>
        </>
      )}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background font-sans" dir="rtl">
      {/* Mobile Header */}
      <header className="flex h-14 items-center justify-between gap-4 border-b bg-muted/40 px-6 lg:hidden">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-0">
              <NavItems />
            </SheetContent>
          </Sheet>
          <div className="font-semibold">اللوحة الرئيسية</div>
        </div>
        <NotificationsPopover />
      </header>

      <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
        {/* Sidebar for Desktop */}
        <div className="hidden border-l bg-muted/40 lg:block">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-14 items-center justify-between border-b px-6">
              <Link to="/" className="flex items-center gap-2 font-semibold">
                <span className="">EduPlatform</span>
              </Link>
              <NotificationsPopover />
            </div>
            <div className="flex-1 overflow-auto py-2">
              <NavItems />
            </div>
            <div className="mt-auto p-4 border-t">
                <Button variant="outline" className="w-full gap-2" onClick={signOut}>
                    <LogOut className="h-4 w-4" />
                    تسجيل الخروج
                </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
