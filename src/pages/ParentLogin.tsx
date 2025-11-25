import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { parentService } from '@/services/parentService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowRight, QrCode, KeyRound } from 'lucide-react';

export default function ParentLogin() {
  const [studentCode, setStudentCode] = useState('');
  const [parentCode, setParentCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const student = await parentService.login(studentCode.trim(), parentCode.trim());
      
      // Store parent session including the code for future verification
      localStorage.setItem('parentSession', JSON.stringify({
        ...student,
        parent_access_code: parentCode.trim()
      }));
      
      toast.success(`مرحباً ولي أمر الطالب ${student.user.name}`);
      navigate('/parent/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4" dir="rtl">
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
            <UsersIcon className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">بوابة ولي الأمر</CardTitle>
          <CardDescription>
            أدخل كود الطالب وكود الدخول الخاص بولي الأمر
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="studentCode">كود الطالب</Label>
              <div className="relative">
                <QrCode className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="studentCode"
                  className="pr-9 font-mono"
                  placeholder="XXXXXXXX"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentCode">كود ولي الأمر</Label>
              <div className="relative">
                <KeyRound className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="parentCode"
                  className="pr-9 font-mono"
                  placeholder="XXXXXX"
                  value={parentCode}
                  onChange={(e) => setParentCode(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'جاري التحقق...' : 'متابعة الطالب'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <Link to="/login" className="flex items-center text-sm text-muted-foreground hover:text-primary">
            <ArrowRight className="ml-1 h-4 w-4" />
            العودة لتسجيل دخول المستخدمين
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
