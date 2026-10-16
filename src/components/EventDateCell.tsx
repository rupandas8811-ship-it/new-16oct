import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, X } from 'lucide-react';
import { Lead } from '../types';
import { deserializeLeadEvents, formatDateDDMMYY } from '../utils';
import { cleanText, getEventCategoryDateTimeTimestamp } from './EventCategoryCell';

export interface EventDateCellProps {
  lead: Lead;
  orders?: any[];
  filterEventDateOption?: string;
}

export interface DateEventItem {
  id: string;
  eventType: string;
  eventName: string;
  eventDate: string;
  formattedDate: string;
  eventTime: string;
  timestamp: number;
}

export const getSortedEventsForDate = (lead: Lead, orders?: any[]): DateEventItem[] => {
  const linkedOrder = orders?.find((o: any) => 
    o.lead_id === lead.lead_id || 
    o.order_id === lead.lead_id || 
    (lead.order_id && (o.order_id === lead.order_id || o.lead_id === lead.order_id)) ||
    ((lead as any).orders && (o.order_id === (lead as any).orders || o.lead_id === (lead as any).orders))
  );

  let rawEventsList: any[] = [];
  if (lead?.events && Array.isArray(lead.events) && lead.events.length > 0) {
    rawEventsList = lead.events;
  } else if (linkedOrder?.events && Array.isArray(linkedOrder.events) && linkedOrder.events.length > 0) {
    rawEventsList = linkedOrder.events;
  } else if (typeof lead?.events === 'string') {
    try {
      const parsed = JSON.parse(lead.events);
      if (Array.isArray(parsed)) rawEventsList = parsed;
    } catch (e) {}
  }

  if (rawEventsList.length === 0 && lead?.notes_special_customizations) {
    rawEventsList = deserializeLeadEvents(lead.notes_special_customizations).events;
  }
  if (rawEventsList.length === 0 && (linkedOrder as any)?.notes_special_customizations) {
    rawEventsList = deserializeLeadEvents((linkedOrder as any).notes_special_customizations).events;
  }

  if (rawEventsList.length > 0) {
    const list: DateEventItem[] = rawEventsList.map((ev: any, idx: number) => {
      const evType = cleanText(ev?.event_type || ev?.event_category || ev?.eventType || lead?.event_type || linkedOrder?.event_type) || 'Event';
      const evName = cleanText(ev?.event_name || ev?.custom_event_name || ev?.event_type || lead?.event_name || linkedOrder?.event_name) || evType;
      const rawDate = ev?.event_date || ev?.Event_Date || ev?.date || lead?.event_date || linkedOrder?.event_date || '';
      const cleanDate = cleanText(rawDate);
      const rawTime = ev?.event_start_time || ev?.event_time || lead?.event_time || linkedOrder?.event_time || '';
      const cleanTime = cleanText(rawTime);
      const timestamp = getEventCategoryDateTimeTimestamp(cleanDate, cleanTime);
      const formattedDate = formatDateDDMMYY(cleanDate);

      return {
        id: ev?.id || ev?.event_id || `evt-${idx}`,
        eventType: evType,
        eventName: evName,
        eventDate: cleanDate,
        formattedDate,
        eventTime: cleanTime,
        timestamp
      };
    });

    // Sort descending by timestamp (newest first)
    list.sort((a, b) => {
      if (a.timestamp && b.timestamp) {
        return b.timestamp - a.timestamp;
      }
      if (a.timestamp) return -1;
      if (b.timestamp) return 1;
      return 0;
    });

    return list;
  }

  // Fallback single event
  const fallbackDate = cleanText(lead?.event_date || linkedOrder?.event_date || '');
  const fallbackType = cleanText(lead?.event_type || linkedOrder?.event_type || 'Event') || 'Event';
  return [{
    id: 'evt-0',
    eventType: fallbackType,
    eventName: cleanText(lead?.event_name || lead?.custom_event_name || fallbackType) || fallbackType,
    eventDate: fallbackDate,
    formattedDate: formatDateDDMMYY(fallbackDate),
    eventTime: cleanText(lead?.event_time || linkedOrder?.event_time || ''),
    timestamp: getEventCategoryDateTimeTimestamp(fallbackDate, lead?.event_time || linkedOrder?.event_time)
  }];
};

export const EventDateCell: React.FC<EventDateCellProps> = ({ lead, orders, filterEventDateOption }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    openUpward: boolean;
  } | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const events = getSortedEventsForDate(lead, orders);
  const targetIndex = (filterEventDateOption === 'last_event' && events.length >= 2) ? 1 : 0;
  const targetEvent = events[targetIndex] || events[0];
  const primaryDate = targetEvent?.formattedDate || '';
  const additionalCount = events.length > 1 ? events.length - 1 : 0;

  const linkedOrder = orders?.find((o: any) => 
    o.lead_id === lead.lead_id || 
    o.order_id === lead.lead_id || 
    (lead.order_id && (o.order_id === lead.order_id || o.lead_id === lead.order_id)) ||
    ((lead as any).orders && (o.order_id === (lead as any).orders || o.lead_id === (lead as any).orders))
  );
  const displayOrderId = cleanText(linkedOrder?.order_id || lead.order_id || (lead as any).orders || lead.lead_id) || 'N/A';

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const popupWidth = Math.min(280, vw - 24);
    let left = rect.left;
    if (left + popupWidth > vw - 12) {
      left = Math.max(12, vw - popupWidth - 12);
    }
    if (left < 12) {
      left = 12;
    }
    const spaceBelow = vh - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    let openUpward = false;
    let top = rect.bottom + 6;
    let maxHeight = Math.max(160, Math.min(340, spaceBelow));
    if (spaceBelow < 180 && spaceAbove > spaceBelow) {
      openUpward = true;
      maxHeight = Math.max(160, Math.min(340, spaceAbove));
      top = Math.max(12, rect.top - maxHeight - 6);
    }
    setCoords({
      top,
      left,
      width: popupWidth,
      maxHeight,
      openUpward,
    });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => {
      updatePosition();
    };
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target;
      if (!target || !(target instanceof Node)) return;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!primaryDate || primaryDate === '—' || primaryDate === '-') {
    return <span className="text-zinc-600 italic font-mono text-xs">—</span>;
  }

  if (additionalCount === 0) {
    return (
      <span className="text-zinc-300 font-mono text-xs truncate max-w-[130px] block" title={primaryDate}>
        {primaryDate}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5 select-text min-w-0">
      <span
        className="text-zinc-200 font-mono text-xs leading-snug truncate max-w-[100px] sm:max-w-[115px]"
        title={primaryDate}
      >
        {primaryDate}
      </span>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono font-bold border rounded-md transition-all shrink-0 cursor-pointer shadow-sm ${
          isOpen
            ? 'bg-amber-500 text-zinc-950 border-amber-400 ring-1 ring-amber-400/50'
            : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500 hover:text-zinc-950 hover:border-amber-400'
        }`}
        title={`Click +${additionalCount} to view all ${events.length} event dates for Order ${displayOrderId}`}
      >
        +{additionalCount}
      </button>

      {isOpen && coords && createPortal(
        <div
          ref={menuRef}
          role="dialog"
          aria-label={`Event Dates for Order ${displayOrderId}`}
          className="fixed bg-zinc-900/95 backdrop-blur-md border border-zinc-750 rounded-xl shadow-2xl z-[99999] overflow-hidden text-zinc-200 animate-in fade-in zoom-in-95 duration-100 select-text"
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            maxHeight: `${coords.maxHeight}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-950/80 border-b border-zinc-800">
            <div className="flex items-center gap-1.5 min-w-0">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[11px] font-mono font-bold text-amber-400 truncate">
                {displayOrderId} • Event Dates
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* List of all event dates belonging to this order (Newest First) */}
          <div className="p-2 space-y-2 overflow-y-auto max-h-[260px]">
            {events.map((ev, idx) => {
              return (
                <div
                  key={ev.id || idx}
                  className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-850 hover:border-zinc-750 transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-4 h-4 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px] font-mono font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <p className="text-xs font-bold text-white truncate">
                        {ev.eventType}
                      </p>
                    </div>
                  </div>
                  {ev.formattedDate ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-300 pl-5.5">
                      <Calendar className="w-3 h-3 text-amber-400/80 shrink-0" />
                      <span>{ev.formattedDate}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-zinc-500 italic font-mono pl-5.5">Date not specified</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 bg-zinc-950/40 border-t border-zinc-850/60 text-[10px] text-zinc-500 font-mono text-center">
            {events.length} Event Date{events.length > 1 ? 's' : ''} (Latest First)
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
