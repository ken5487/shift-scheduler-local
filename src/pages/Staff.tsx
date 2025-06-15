
import { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pharmacist } from '@/lib/types';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

const Staff = () => {
  const { pharmacists, addPharmacist, updatePharmacist, deletePharmacist } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPharmacist, setCurrentPharmacist] = useState<Pharmacist | null>(null);
  const [formData, setFormData] = useState({ name: '', position: '正職' as '正職' | '兼職' });

  const openDialog = (pharmacist: Pharmacist | null = null) => {
    setCurrentPharmacist(pharmacist);
    setFormData(pharmacist ? { name: pharmacist.name, position: pharmacist.position } : { name: '', position: '正職' });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) return;
    if (currentPharmacist) {
      updatePharmacist({ ...currentPharmacist, ...formData });
    } else {
      addPharmacist(formData);
    }
    setIsDialogOpen(false);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">藥師管理</h1>
        <Button onClick={() => openDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          新增藥師
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>職位</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pharmacists.map((pharmacist) => (
                <TableRow key={pharmacist.id}>
                  <TableCell className="font-medium">{pharmacist.name}</TableCell>
                  <TableCell>{pharmacist.position}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(pharmacist)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deletePharmacist(pharmacist.id)}>
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
            <DialogTitle>{currentPharmacist ? '編輯藥師' : '新增藥師'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">姓名</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="position" className="text-right">職位</Label>
              <Select value={formData.position} onValueChange={(value: '正職' | '兼職') => setFormData({...formData, position: value})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="選擇職位" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="正職">正職</SelectItem>
                  <SelectItem value="兼職">兼職</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            <Button onClick={handleSave}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Staff;
