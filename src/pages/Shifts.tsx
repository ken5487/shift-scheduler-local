
import { useState, useEffect } from 'react';
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

const SaturdayLeaveSettingsCard = () => {
  const { saturdayLeaveLimits, updateSaturdayLeaveLimits } = useAppContext();
  const [limits, setLimits] = useState(saturdayLeaveLimits);

  useEffect(() => {
    setLimits(saturdayLeaveLimits);
  }, [saturdayLeaveLimits]);

  const handleSave = () => {
    const regularLimit = Number(limits.regular);
    const nightLimit = Number(limits.night);

    if (isNaN(regularLimit) || isNaN(nightLimit) || regularLimit < 0 || nightLimit < 0) {
      toast.error('請輸入有效的數字 (必須大於或等於 0)');
      return;
    }

    updateSaturdayLeaveLimits({
      regular: regularLimit,
      night: nightLimit,
    });
    toast.success('週六休假設定已儲存');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>週六休假上限設定</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="regular-limit">一般藥師 (每月可排休週六天數)</Label>
            <Input
              id="regular-limit"
              type="number"
              value={limits.regular}
              onChange={(e) => setLimits(prev => ({ ...prev, regular: Number(e.target.value) }))}
              min="0"
              placeholder="例如: 1"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="night-limit">有夜班藥師 (每月可排休週六天數)</Label>
            <Input
              id="night-limit"
              type="number"
              value={limits.night}
              onChange={(e) => setLimits(prev => ({ ...prev, night: Number(e.target.value) }))}
              min="0"
              placeholder="例如: 2"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave}>儲存設定</Button>
        </div>
      </CardContent>
    </Card>
  );
};

const Shifts = () => {
  const { shifts, addShift, updateShift, deleteShift } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState({ name: '', startTime: '08:00', endTime: '16:00' });

  const openDialog = (shift: Shift | null = null) => {
    setCurrentShift(shift);
    setFormData(shift ? { name: shift.name, startTime: shift.startTime, endTime: shift.endTime } : { name: '', startTime: '08:00', endTime: '16:00' });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) return;
    if (currentShift) {
      updateShift({ ...currentShift, ...formData });
    } else {
      addShift(formData);
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
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell className="font-medium">{shift.name}</TableCell>
                  <TableCell>{shift.startTime}</TableCell>
                  <TableCell>{shift.endTime}</TableCell>
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
      
      <SaturdayLeaveSettingsCard />
      
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
