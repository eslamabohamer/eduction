// src/pages/Login.tsx
// صفحة تسجيل الدخول (تدعم البريد الإلكتروني أو اسم المستخدم)
// Login page supporting Email or Username login.

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Login() {
  const [identifier, setIdentifier] = useState(''); // Email or Username
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Logic to handle username login
      // If input doesn't look like an email, assume it's a username
      // In a real production app, we might query a 'usernames' table to get the email
      // OR assume a convention like username@system.local if that's how we created them.
      // For this demo, we'll assume if no '@', it's a username and we might need to ask user for email
      // OR we just pass it as is if Supabase is configured for it (it usually isn't by default).
      
      let emailToUse = identifier.trim();
      
      // Simple heuristic: if no '@', append a placeholder domain or warn
      // NOTE: The create_student_record function likely generates a fake email for students
      // e.g. username@student.local
      if (!emailToUse.includes('@')) {
         // We'll try appending a common domain we might have used during creation
         // or just let Supabase try to handle it (it will likely fail if not email).
         // Let's assume the convention used in create_student_record was username@edu.local
         emailToUse = `${emailToUse}@edu.local`;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (error) {
        // If failed with appended domain, maybe try raw if it was actually an email
        if (emailToUse !== identifier && error.message.includes('Invalid login credentials')) {
             toast.error('فشل تسجيل الدخول', { description: 'تأكد من اسم المستخدم أو البريد الإلكتروني' });
        } else {
             toast.error('فشل تسجيل الدخول', { description: error.message });
        }
      } else {
        toast.success('تم تسجيل الدخول بنجاح');
        navigate('/');
      }
    } catch (err) {
        toast.error('حدث خطأ غير متوقع');
        console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
          <CardDescription>
            أدخل البريد الإلكتروني أو اسم المستخدم للدخول
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">البريد الإلكتروني / اسم المستخدم</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="name@example.com أو اسم المستخدم"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoCapitalize="none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'جاري التحميل...' : 'دخول'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center flex-col gap-2">
          <Link
            to="/parent-login"
            className="text-primary text-sm hover:underline"
          >
            دخول ولي الأمر بكود الطالب
          </Link>
          <p className="text-sm text-muted-foreground">
            ليس لديك حساب؟{' '}
            <Link to="/register" className="text-primary hover:underline">
              أنشئ حساب جديد (للمعلمين)
            </Link>
          </p>
          <p className="text-xs text-muted-foreground">
            الطلاب: يرجى طلب بيانات الدخول من إدارة المدرسة
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
