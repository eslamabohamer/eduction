// src/pages/admin/GlobalUsersPage.tsx
// صفحة إدارة المستخدمين العالمية
// Global user search and management.



import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Search, User, Shield, Calendar, Mail, BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { arEG } from 'date-fns/locale';

export default function GlobalUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Load initial users (optional, maybe top 20 recent)
  useEffect(() => {
    handleSearch(new Event('submit') as any);
  }, []);

  async function handleSearch(e: React.FormEvent) {
    if (e) e.preventDefault();

    setLoading(true);
    try {
      const response = await adminService.searchGlobalUsers(search);
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        setUsers([]);
        if (search) toast.error('لم يتم العثور على نتائج');
      }
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء البحث');
    } finally {
      setLoading(false);
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'Admin': return <Badge variant="destructive" className="gap-1"><Shield className="w-3 h-3" /> مسؤول</Badge>;
      case 'Teacher': return <Badge variant="default" className="bg-purple-600 hover:bg-purple-700 gap-1"><BadgeCheck className="w-3 h-3" /> معلم</Badge>;
      case 'Student': return <Badge variant="secondary" className="gap-1"><User className="w-3 h-3" /> طالب</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-8 p-8 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">إدارة المستخدمين</h1>
        <p className="text-slate-500">البحث وإدارة جميع المستخدمين في المنصة</p>
      </div>

      <Card className="border-none shadow-md bg-white">
        <CardHeader>
          <CardTitle>البحث عن مستخدم</CardTitle>
          <CardDescription>يمكنك البحث بواسطة الاسم أو البريد الإلكتروني</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث هنا..."
                className="pr-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading} className="min-w-[100px]">
              {loading ? 'جاري البحث...' : 'بحث'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-none shadow-md bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-right">المستخدم</TableHead>
              <TableHead className="text-right">الدور</TableHead>
              <TableHead className="text-right">البريد الإلكتروني</TableHead>
              <TableHead className="text-right">تاريخ الانضمام</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <User className="h-8 w-8 opacity-20" />
                    <p>{loading ? 'جاري تحميل البيانات...' : 'لا توجد نتائج لعرضها'}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                        {user.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{user.name}</span>
                        <span className="text-xs text-slate-500 font-mono">{user.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getRoleBadge(user.role)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="h-3 w-3" />
                      {user.created_at ? format(new Date(user.created_at), 'dd MMMM yyyy', { locale: arEG }) : '-'}
                    </div>
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
