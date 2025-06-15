
import { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shift } from '@/lib/types';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const Shifts = () => {
  const { shifts, addShift, updateShift, deleteShift } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState({ name: '', startTime: '08:00', endTime: '16:00', saturdayLeaveLimit: 1 });

  const openDialog = (shift: Shift | null = null) => {
    setCurrentShift(shift);
    if (shift) {
      setFormData({
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        saturdayLeaveLimit: shift.saturdayLeaveLimit,
      });
    } else {
      setFormData({ name: '', startTime: '08:00', endTime: '16:00', saturdayLeaveLimit: 1 });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) {
      toast.error('請輸入班型名稱');
      return;
    }
    const limit = Number(formData.saturdayLeaveLimit);
    if (isNaN(limit) || limit < 0) {
      toast.error('請輸入有效的週六可休天數 (必須大於或等於 0)');
      return;
    }

    const shiftData = {
      name: formData.name,
      startTime: formData.startTime,
      endTime: formData.endTime,
      saturdayLeaveLimit: limit
    };

    if (currentShift) {
      updateShift({ ...shiftData, id: currentShift.id });
      toast.success('班型已更新');
    } else {
      addShift(shiftData);
      toast.success('班型已新增');
    }
    setIsDialogOpen(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">班型管理</h1>
        <Button onClick={() => openDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          新增班型
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>班型名稱</TableHead>
                <TableHead>開始時間</TableHead>
                <TableHead>結束時間</TableHead>
                <TableHead>週六可休天數</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell className="font-medium">{shift.name}</TableCell>
                  <TableCell>{shift.startTime}</TableCell>
                  <TableCell>{shift.endTime}</TableCell>
                  <TableCell>{shift.saturdayLeaveLimit}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(shift)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteShift(shift.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentShift ? '編輯班型' : '新增班型'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">名稱</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startTime" className="text-right">開始時間</Label>
              <Input id="startTime" type="time" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endTime" className="text-right">結束時間</Label>
              <Input id="endTime" type="time" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="saturdayLeaveLimit" className="text-right">週六休假上限</Label>
              <Input 
                id="saturdayLeaveLimit"
                type="number"
                value={formData.saturdayLeaveLimit}
                onChange={(e) => setFormData(prev => ({ ...prev, saturdayLeaveLimit: e.target.value === '' ? 0 : parseInt(e.target.value, 10) }))}
                className="col-span-3"
                min="0"
                placeholder="例如: 1"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            <Button onClick={handleSave}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Shifts;
