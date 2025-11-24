// src/components/students/EditStudentDialog.tsx
// نافذة تعديل بيانات الطالب
// Dialog to edit student profile information.

import { useState, useEffect } from 'react';
import { studentService, StudentWithUser } from '@/services/studentService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Props {
  student: StudentWithUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditStudentDialog({ student, open, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    level: '',
    parent_name: '',
    parent_phone: '',
    address: '',
    emergency_contact: ''
  });

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.user.name,
        grade: student.grade,
        level: student.level,
        parent_name: student.parent_name || '',
        parent_phone: student.parent_phone || '',
        address: student.address || '',
        emergency_contact: student.emergency_contact || ''
      });
    }
  }, [student, open]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const response = await studentService.updateStudent(student.id, formData);
    if (response.success) {
      toast.success('تم تحديث البيانات بنجاح');
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(response.error?.message || 'فشل تحديث البيانات');
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>تعديل بيانات الطالب</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>اسم الطالب</Label>
            <Input
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>المرحلة</Label>
              <Input
                required
                value={formData.level}
                onChange={e => setFormData({ ...formData, level: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>الصف</Label>
              <Input
                required
                value={formData.grade}
                onChange={e => setFormData({ ...formData, grade: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3 text-muted-foreground">بيانات التواصل</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ولي الأمر</Label>
                <Input
                  value={formData.parent_name}
                  onChange={e => setFormData({ ...formData, parent_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input
                  value={formData.parent_phone}
                  onChange={e => setFormData({ ...formData, parent_phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label>العنوان</Label>
              <Input
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="space-y-2 mt-4">
              <Label>رقم الطوارئ</Label>
              <Input
                value={formData.emergency_contact}
                onChange={e => setFormData({ ...formData, emergency_contact: e.target.value })}
                placeholder="رقم آخر للتواصل"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
