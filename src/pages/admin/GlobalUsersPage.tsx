// src/pages/admin/GlobalUsersPage.tsx
// صفحة إدارة المستخدمين العالمية
// Global user search and management.

import { useState } from 'react';
import { adminService } from '@/services/adminService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Search, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function GlobalUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    
    setLoading(true);
    try {
      const data = await adminService.searchGlobalUsers(search);
      setUsers(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">إدارة المستخدمين (بحث شامل)</h1>

      <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
        <Input 
          placeholder="بحث بالاسم أو البريد الإلكتروني..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Button type="submit" disabled={loading}>
          <Search className="h-4 w-4 ml-2" />
          بحث
        </Button>
      </form>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">الدور</TableHead>
              <TableHead className="text-right">المعرف (Auth ID)</TableHead>
              <TableHead className="text-right">تاريخ التسجيل</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  {loading ? 'جاري البحث...' : 'قم بالبحث لعرض النتائج'}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {user.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{user.auth_id}</TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
