// src/components/students/StudentQuickView.tsx
// مكون العرض السريع للطالب (محاكاة الماسح الضوئي)
// Component for quick student lookup via code (Barcode Scanner simulation).

import { useState, useRef, useEffect } from 'react';
import { studentService, StudentWithUser } from '@/services/studentService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScanLine, User, Calendar, CreditCard, Activity } from 'lucide-react';
import { toast } from 'sonner';

export function StudentQuickView() {
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState<StudentWithUser | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setStudent(null);
      setCode('');
    }
  }, [isOpen]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    try {
      const data = await studentService.getStudentByCode(code.trim());
      if (data) {
        setStudent(data);
        toast.success('تم العثور على الطالب');
      } else {
        toast.error('لم يتم العثور على طالب بهذا الكود');
        setStudent(null);
      }
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء البحث');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ScanLine className="h-4 w-4" />
          المسح السريع
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            العرض السريع للطالب
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Scanner Input */}
          <form onSubmit={handleScan} className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="امسح الباركود أو أدخل كود الطالب..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="text-lg font-mono"
              autoComplete="off"
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'جاري البحث...' : 'بحث'}
            </Button>
          </form>

          {/* Student Details */}
          {student && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Header Info */}
              <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{student.user.name}</h3>
                  <p className="text-muted-foreground">
                    {student.level} - {student.grade}
                  </p>
                  <p className="text-xs font-mono mt-1 bg-background px-2 py-0.5 rounded border inline-block">
                    {student.student_code}
                  </p>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">الحضور</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">--%</div>
                    <p className="text-xs text-muted-foreground">نسبة الحضور هذا الشهر</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">المدفوعات</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">--</div>
                    <p className="text-xs text-muted-foreground">حالة الدفع الأخيرة</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">الأداء</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">--</div>
                    <p className="text-xs text-muted-foreground">متوسط الدرجات</p>
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                 <Button variant="secondary" onClick={() => {
                    setStudent(null);
                    setCode('');
                    inputRef.current?.focus();
                 }}>
                    مسح تالي
                 </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
