// src/pages/Register.tsx
// صفحة تسجيل حساب جديد (إنشاء مدرسة/مركز)
// Registration page for creating a new Tenant (School/Center/Teacher).

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    tenantName: '',
    tenantType: 'individual',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: 'Teacher', // Default role for creator
            tenant_name: formData.tenantName,
            tenant_type: formData.tenantType,
          },
        },
      });

      if (error) {
        toast.error('فشل إنشاء الحساب', { description: error.message });
      } else {
        toast.success('تم إنشاء الحساب بنجاح!', {
          description: 'يمكنك الآن تسجيل الدخول.'
        });
        navigate('/login');
      }
    } catch (err) {
      toast.error('حدث خطأ غير متوقع');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">إنشاء حساب جديد</CardTitle>
          <CardDescription>
            سجل بياناتك لإنشاء مساحتك التعليمية الخاصة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">الاسم الكامل</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="أحمد محمد"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="name@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-medium mb-3 text-muted-foreground">بيانات المؤسسة / المركز</h3>
              
              <div className="space-y-2 mb-3">
                <Label htmlFor="tenantName">اسم المدرسة / المركز</Label>
                <Input
                  id="tenantName"
                  value={formData.tenantName}
                  onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                  required
                  placeholder="مركز التفوق التعليمي"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenantType">نوع الحساب</Label>
                <Select 
                  value={formData.tenantType} 
                  onValueChange={(val) => setFormData({ ...formData, tenantType: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر النوع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">معلم مستقل</SelectItem>
                    <SelectItem value="center">مركز تعليمي</SelectItem>
                    <SelectItem value="school">مدرسة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full mt-4" disabled={loading}>
              {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            لديك حساب بالفعل؟{' '}
            <Link to="/login" className="text-primary hover:underline">
              تسجيل الدخول
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
