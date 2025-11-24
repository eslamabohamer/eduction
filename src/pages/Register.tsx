// src/pages/Register.tsx
// صفحة تسجيل حساب جديد (إنشاء مدرسة/مركز/سكرتارية)
// Registration page for creating a new Tenant or Staff.

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
    role: 'Teacher', // Teacher | Secretary
    tenantName: '', // For Teacher
    tenantCode: '', // For Secretary
    tenantType: 'individual',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const options: any = {
        data: {
          name: formData.name,
          role: formData.role,
        },
      };

      if (formData.role === 'Teacher') {
        options.data.tenant_name = formData.tenantName;
        options.data.tenant_type = formData.tenantType;
      } else if (formData.role === 'Secretary') {
        // In a real app, we would validate the tenant code here
        // For now, we assume the code IS the tenant_id (UUID)
        // Or we could search for tenant by a simpler code
        options.data.tenant_id = formData.tenantCode; 
      }

      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options,
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
            سجل بياناتك للانضمام إلى المنصة
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

            <div className="space-y-2">
              <Label>نوع الحساب</Label>
              <Select 
                value={formData.role} 
                onValueChange={(val) => setFormData({ ...formData, role: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Teacher">معلم / مدير (إنشاء مدرسة جديدة)</SelectItem>
                  <SelectItem value="Secretary">سكرتارية (انضمام لمدرسة)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4 mt-4">
              {formData.role === 'Teacher' ? (
                <>
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
                    <Label htmlFor="tenantType">النوع</Label>
                    <Select 
                      value={formData.tenantType} 
                      onValueChange={(val) => setFormData({ ...formData, tenantType: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">معلم مستقل</SelectItem>
                        <SelectItem value="center">مركز تعليمي</SelectItem>
                        <SelectItem value="school">مدرسة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">بيانات الانضمام</h3>
                  <div className="space-y-2">
                    <Label htmlFor="tenantCode">كود المدرسة / المركز (Tenant ID)</Label>
                    <Input
                      id="tenantCode"
                      value={formData.tenantCode}
                      onChange={(e) => setFormData({ ...formData, tenantCode: e.target.value })}
                      required
                      placeholder="اطلب الكود من المعلم المسؤول"
                    />
                    <p className="text-xs text-muted-foreground">
                      يجب الحصول على معرف المؤسسة (Tenant ID) من مدير النظام
                    </p>
                  </div>
                </>
              )}
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
