// src/pages/admin/TenantsPage.tsx
// صفحة إدارة المستأجرين (المدارس/المعلمين)
// Page for managing tenants (Suspend, Activate, View).



import { useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, MoreHorizontal, Ban, CheckCircle, Building, Mail, Calendar } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { arEG } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [actionType, setActionType] = useState<'suspend' | 'activate' | null>(null);

  useEffect(() => {
    loadTenants();
  }, []);

  async function loadTenants() {
    try {
      const response = await adminService.getTenants();
      if (response.success && response.data) {
        setTenants(response.data);
      } else {
        toast.error(response.error?.message || 'فشل تحميل البيانات');
      }
    } catch (error) {
      console.error(error);
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange() {
    if (!selectedTenant || !actionType) return;

    const newStatus = actionType === 'activate' ? 'active' : 'suspended';

    try {
      const response = await adminService.toggleTenantStatus(selectedTenant.id, newStatus);
      if (response.success) {
        toast.success(`تم ${actionType === 'activate' ? 'تفعيل' : 'إيقاف'} الحساب بنجاح`);
        loadTenants();
      } else {
        toast.error(response.error?.message || 'فشل تغيير الحالة');
      }
    } catch (error) {
      toast.error('فشل تغيير الحالة');
    } finally {
      setSelectedTenant(null);
      setActionType(null);
    }
  }

  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 p-8 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">إدارة المدارس والمراكز</h1>
        <p className="text-slate-500">إدارة حسابات المعلمين والمدارس المسجلة في المنصة</p>
      </div>

      <Card className="border-none shadow-md bg-white">
        <CardHeader>
          <CardTitle>البحث والتصفية</CardTitle>
          <CardDescription>ابحث عن مدرسة أو معلم لإدارة صلاحياتهم</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو البريد الإلكتروني..."
              className="pr-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-md bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">البريد الإلكتروني</TableHead>
              <TableHead className="text-right">تاريخ الانضمام</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Building className="h-8 w-8 opacity-20 animate-pulse" />
                    <p>جاري تحميل البيانات...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredTenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Building className="h-8 w-8 opacity-20" />
                    <p>لا توجد مدارس أو معلمين مطابقين للبحث</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredTenants.map((tenant) => (
                <TableRow key={tenant.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Building className="h-5 w-5" />
                      </div>
                      <span className="text-slate-900">{tenant.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="h-3 w-3" />
                      {tenant.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="h-3 w-3" />
                      {tenant.created_at ? format(new Date(tenant.created_at), 'dd MMMM yyyy', { locale: arEG }) : '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tenant.status === 'suspended' ? 'destructive' : 'default'} className={tenant.status === 'active' ? 'bg-green-500 hover:bg-green-600' : ''}>
                      {tenant.status === 'suspended' ? 'موقوف' : 'نشط'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => { setSelectedTenant(tenant); setActionType('activate'); }}
                          className="text-green-600 focus:text-green-700 focus:bg-green-50"
                        >
                          <CheckCircle className="h-4 w-4 ml-2" />
                          تفعيل الحساب
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => { setSelectedTenant(tenant); setActionType('suspend'); }}
                          className="text-red-600 focus:text-red-700 focus:bg-red-50"
                        >
                          <Ban className="h-4 w-4 ml-2" />
                          إيقاف الحساب
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={!!selectedTenant} onOpenChange={(open) => !open && setSelectedTenant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'suspend' ? 'تأكيد إيقاف الحساب' : 'تأكيد تفعيل الحساب'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'suspend'
                ? `هل أنت متأكد من رغبتك في إيقاف حساب "${selectedTenant?.name}"؟ لن يتمكن المستخدم من تسجيل الدخول.`
                : `هل أنت متأكد من رغبتك في تفعيل حساب "${selectedTenant?.name}"؟ سيتمكن المستخدم من الوصول للمنصة.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusChange}
              className={actionType === 'suspend' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {actionType === 'suspend' ? 'إيقاف الحساب' : 'تفعيل الحساب'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
