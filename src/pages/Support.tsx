
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const WEEKDAYS = ["一", "二", "三", "四", "五"];

const Support = () => {
    const { supportNeeds, updateSupportNeed } = useAppContext();

    const handleCountChange = (dayOfWeek: number, timeSlot: 'morning' | 'afternoon', value: string) => {
        const count = parseInt(value, 10);
        if (!isNaN(count)) {
            updateSupportNeed(dayOfWeek, timeSlot, count >= 0 ? count : 0);
        }
    };

    const getNeed = (dayOfWeek: number, timeSlot: 'morning' | 'afternoon') => {
        return supportNeeds.find(n => n.dayOfWeek === dayOfWeek && n.timeSlot === timeSlot)?.count || 0;
    };

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-semibold">支援人力設定</h1>
            <Card>
                <CardHeader>
                    <CardTitle>設定週一至週五的支援人力</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        設定各時段需要的支援藥師數量。若設為 0 表示該時段不需要支援。
                    </p>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px] min-w-[100px]">時段</TableHead>
                                    {WEEKDAYS.map((day, index) => (
                                        <TableHead key={index} className="text-center min-w-[120px]">週{day}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium">上午</TableCell>
                                    {WEEKDAYS.map((_, index) => {
                                        const dayOfWeek = index + 1;
                                        return (
                                            <TableCell key={dayOfWeek} className="text-center">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    className="mx-auto w-20 text-center"
                                                    value={getNeed(dayOfWeek, 'morning')}
                                                    onChange={(e) => handleCountChange(dayOfWeek, 'morning', e.target.value)}
                                                />
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">下午</TableCell>
                                    {WEEKDAYS.map((_, index) => {
                                        const dayOfWeek = index + 1;
                                        return (
                                            <TableCell key={dayOfWeek} className="text-center">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    className="mx-auto w-20 text-center"
                                                    value={getNeed(dayOfWeek, 'afternoon')}
                                                    onChange={(e) => handleCountChange(dayOfWeek, 'afternoon', e.target.value)}
                                                />
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Support;
