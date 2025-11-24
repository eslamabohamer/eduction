// src/pages/admin/TenantsPage.tsx
// صفحة إدارة المستأجرين (المدارس/المعلمين)
// Page for managing tenants (Suspend, Activate, View).

import { useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, MoreHorizontal, Ban, CheckCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  async function handleStatusChange(id: string, status: 'active' | 'suspended') {
    try {
      const response = await adminService.toggleTenantStatus(id, status);
      if (response.success) {
        toast.success(`تم تغيير الحالة إلى ${status === 'active' ? 'نشط' : 'موقوف'}`);
        loadTenants();
      } else {
        toast.error(response.error?.message || 'فشل تغيير الحالة');
      }
    } catch (error) {
      toast.error('فشل تغيير الحالة');
    }
  }

  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">إدارة المدارس والمراكز</h1>
        <div className="relative w-64">
          <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث..."
            className="pr-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
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
                <TableCell colSpan={5} className="text-center py-8">جاري التحميل...</TableCell>
              </TableRow>
            ) : filteredTenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد نتائج</TableCell>
              </TableRow>
            ) : (
              filteredTenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>{tenant.email}</TableCell>
                  <TableCell>{format(new Date(tenant.created_at), 'yyyy-MM-dd')}</TableCell>
                  <TableCell>
                    <Badge variant={tenant.status === 'suspended' ? 'destructive' : 'default'}>
                      {tenant.status === 'suspended' ? 'موقوف' : 'نشط'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleStatusChange(tenant.id, 'active')}>
                          <CheckCircle className="h-4 w-4 ml-2 text-green-600" />
                          تفعيل الحساب
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(tenant.id, 'suspended')}>
                          <Ban className="h-4 w-4 ml-2 text-red-600" />
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
    </div>
  );
}
