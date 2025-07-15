import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import dayjs from 'dayjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Trash2, Plus, Edit2 } from 'lucide-react';
import { ScheduleEvent } from '@/lib/types';

interface EventsManagerProps {
  currentMonth: dayjs.Dayjs;
  onEventDrop: (eventId: string, date: string) => void;
}

const EventsManager: React.FC<EventsManagerProps> = ({ currentMonth, onEventDrop }) => {
  const { events, addEvent, updateEvent, deleteEvent } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<ScheduleEvent | null>(null);
  const [eventName, setEventName] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedColor, setSelectedColor] = useState('#3b82f6');

  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
    '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6b7280'
  ];

  const openDialog = (event: ScheduleEvent | null = null) => {
    setCurrentEvent(event);
    if (event) {
      setEventName(event.name);
      setSelectedDate(dayjs(event.date).toDate());
      setSelectedColor(event.color);
    } else {
      setEventName('');
      setSelectedDate(undefined);
      setSelectedColor('#3b82f6');
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!eventName || !selectedDate) return;
    
    const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
    
    if (currentEvent) {
      updateEvent({
        ...currentEvent,
        name: eventName,
        date: dateStr,
        color: selectedColor
      });
    } else {
      addEvent({
        name: eventName,
        date: dateStr,
        color: selectedColor
      });
    }
    
    setIsDialogOpen(false);
  };

  const currentMonthEvents = events.filter(event => 
    dayjs(event.date).isSame(currentMonth, 'month')
  );

  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    e.dataTransfer.setData('text/plain', eventId);
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">備註事件</CardTitle>
          <Button size="sm" onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-1" />
            新增事件
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 事件池 */}
          <div>
            <h4 className="font-medium mb-2">事件列表</h4>
            <div className="flex flex-wrap gap-2">
              {currentMonthEvents.map(event => (
                <Badge
                  key={event.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, event.id)}
                  style={{ backgroundColor: event.color }}
                  className="cursor-move px-3 py-1 text-white hover:opacity-80 flex items-center gap-2"
                >
                  <span>{event.name}</span>
                  <div className="flex gap-1">
                    <Edit2 
                      className="h-3 w-3 cursor-pointer hover:opacity-70" 
                      onClick={(e) => {
                        e.stopPropagation();
                        openDialog(event);
                      }}
                    />
                    <Trash2 
                      className="h-3 w-3 cursor-pointer hover:opacity-70" 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteEvent(event.id);
                      }}
                    />
                  </div>
                </Badge>
              ))}
            </div>
          </div>

          {/* 月曆 */}
          <div>
            <h4 className="font-medium mb-2">{currentMonth.format('YYYY年MM月')}</h4>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentMonth.toDate()}
              className="rounded-md border pointer-events-auto"
            />
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentEvent ? '編輯事件' : '新增事件'}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="eventName">事件名稱</Label>
                <Input
                  id="eventName"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="輸入事件名稱"
                />
              </div>
              
              <div>
                <Label htmlFor="eventDate">日期</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border pointer-events-auto"
                />
              </div>
              
              <div>
                <Label>顏色</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {colors.map(color => (
                    <div
                      key={color}
                      className={`w-8 h-8 rounded-full cursor-pointer border-2 ${
                        selectedColor === color ? 'border-gray-900' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSave}>
                {currentEvent ? '更新' : '新增'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default EventsManager;