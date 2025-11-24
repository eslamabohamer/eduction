// src/pages/settings/SettingsPage.tsx
// صفحة الإعدادات (للمعلم/المدير)
// Settings page for Teachers to view Tenant ID and manage profile.

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Copy, Building, User, ShieldCheck, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [tenantInfo, setTenantInfo] = useState<{id: string, name: string, type: string} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'Teacher' || user?.role === 'Secretary') {
      loadTenantInfo();
    } else {
      setLoading(false);
    }
  }, [user]);

  async function loadTenantInfo() {
    try {
      // In our current schema, tenant info might be stored in a 'tenants' table 
      // or just implicitly via the tenant_id in users table.
      // For this implementation, we'll fetch what we can from the user record 
      // and potentially a tenants table if it exists (assuming it does from previous context).
      
      // If we don't have a tenants table in the schema provided, we'll mock the name 
      // or use the one stored in metadata if available.
      // Let's assume we just display the ID for now which is critical.
      
      setTenantInfo({
        id: user?.tenant_id || '',
        name: '    المركز التعليمي', // Placeholder if no tenants table
        type: 'School'
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('تم نسخ الكود بنجاح');
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الإعدادات</h1>
        <p className="text-muted-foreground">إدارة الحساب ومعلومات المؤسسة</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="w-full justify-start h-auto p-1 bg-muted/50">
          <TabsTrigger value="general" className="flex-1 md:flex-none">عام</TabsTrigger>
          {user.role === 'Teacher' && (
            <TabsTrigger value="school" className="flex-1 md:flex-none">بيانات المدرسة</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>الملف الشخصي</CardTitle>
              <CardDescription>بياناتك الشخصية المسجلة في النظام</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>الاسم</Label>
                <Input value={user.name} readOnly className="bg-muted/50" />
              </div>
              <div className="grid gap-2">
                <Label>البريد الإلكتروني</Label>
                <Input value={user.email || ''} readOnly className="bg-muted/50" />
              </div>
              <div className="grid gap-2">
                <Label>نوع الحساب</Label>
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/20 w-fit px-4">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {user.role === 'Teacher' ? 'معلم / مدير' : 
                     user.role === 'Secretary' ? 'سكرتارية' : user.role}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button variant="destructive" onClick={signOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {user.role === 'Teacher' && (
          <TabsContent value="school" className="mt-6 space-y-6">
            <Card className="border-primary/20 shadow-sm">
              <CardHeader className="bg-primary/5 border-b">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  <CardTitle>معرف المؤسسة (Tenant ID)</CardTitle>
                </div>
                <CardDescription>
                  هذا الكود مطلوب لربط حسابات السكرتارية والموظفين الجدد ب المركز التعليمي .
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 p-4 bg-muted rounded-lg border border-dashed border-primary/30">
                  <code className="flex-1 font-mono text-sm break-all">
                    {tenantInfo?.id || 'جاري التحميل...'}
                  </code>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={() => copyToClipboard(tenantInfo?.id || '')}
                    className="shrink-0 gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    نسخ
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  * شارك هذا الكود فقط مع الموظفين الموثوقين (السكرتارية) عند تسجيل حساباتهم.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>تخصيص النظام</CardTitle>
                <CardDescription>إعدادات عامة للمدرسة</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                   <div className="grid gap-2">
                    <Label>اسم المدرسة / المركز</Label>
                    <Input defaultValue={tenantInfo?.name} placeholder="اسم المؤسسة" />
                  </div>
                  <Button disabled variant="outline">حفظ التغييرات (قريباً)</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
