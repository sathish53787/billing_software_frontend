import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import './DateRangePicker.css';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const parseYmd = (value) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const toYmd = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const toDisplay = (ymd) => {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}-${m}-${y}`;
};

const todayYmd = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  // Prefer IST to match billing app
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const get = (type) => parts.find((part) => part.type === type)?.value || '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    return `${y}-${m}-${d}`;
  }
};

const sameDay = (a, b) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const DateRangePicker = ({
  label = 'Select Date',
  fromDate: fromDateProp,
  toDate: toDateProp,
  onChange,
  id = 'date-range',
}) => {
  const today = todayYmd();
  const fromDate = fromDateProp || today;
  const toDate = toDateProp || fromDateProp || today;
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => parseYmd(fromDate) || new Date());
  const [draftFrom, setDraftFrom] = useState(fromDate);
  const [draftTo, setDraftTo] = useState(toDate);
  const [pickingEnd, setPickingEnd] = useState(false);

  useEffect(() => {
    if (!open) {
      setDraftFrom(fromDate);
      setDraftTo(toDate);
      setPickingEnd(false);
      setViewMonth(parseYmd(fromDate) || new Date());
    }
  }, [fromDate, toDate, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const days = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const start = new Date(year, month, 1 - startPad);
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
  }, [viewMonth]);

  const fromObj = parseYmd(draftFrom);
  const toObj = parseYmd(draftTo);
  const displayValue =
    draftFrom && draftTo
      ? `${toDisplay(draftFrom)} - ${toDisplay(draftTo)}`
      : draftFrom
        ? `${toDisplay(draftFrom)} - …`
        : '';

  const monthLabel = viewMonth.toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const commitRange = (nextFrom, nextTo) => {
    if (typeof onChange === 'function') {
      onChange({ fromDate: nextFrom, toDate: nextTo || nextFrom });
    }
  };

  const onDayClick = (date) => {
    const ymd = toYmd(date);
    if (!pickingEnd || !draftFrom) {
      setDraftFrom(ymd);
      setDraftTo('');
      setPickingEnd(true);
      return;
    }

    let nextFrom = draftFrom;
    let nextTo = ymd;
    if (ymd < draftFrom) {
      nextFrom = ymd;
      nextTo = draftFrom;
    }
    setDraftFrom(nextFrom);
    setDraftTo(nextTo);
    setPickingEnd(false);
    commitRange(nextFrom, nextTo);
    setOpen(false);
  };

  const dayClass = (date) => {
    const classes = ['drp-day'];
    if (date.getMonth() !== viewMonth.getMonth()) classes.push('is-outside');
    if (sameDay(date, startOfDay(new Date()))) classes.push('is-today');

    const day = startOfDay(date);
    const from = fromObj ? startOfDay(fromObj) : null;
    const to = toObj ? startOfDay(toObj) : null;

    if (from && sameDay(day, from)) classes.push('is-start');
    if (to && sameDay(day, to)) classes.push('is-end');
    if (from && to && day > from && day < to) classes.push('is-in-range');
    if (from && !to && sameDay(day, from)) classes.push('is-start');

    return classes.join(' ');
  };

  return (
    <div className="drp" ref={rootRef}>
      {label ? (
        <label className="drp-label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <button
        id={id}
        type="button"
        className={`drp-trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{displayValue || 'Select date range'}</span>
        <FiCalendar size={15} aria-hidden />
      </button>

      {open ? (
        <div className="drp-popover" role="dialog" aria-label="Select date range">
          <div className="drp-month-nav">
            <button
              type="button"
              className="drp-nav-btn"
              aria-label="Previous month"
              onClick={() =>
                setViewMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                )
              }
            >
              <FiChevronLeft size={18} />
            </button>
            <div className="drp-month-label">{monthLabel}</div>
            <button
              type="button"
              className="drp-nav-btn"
              aria-label="Next month"
              onClick={() =>
                setViewMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                )
              }
            >
              <FiChevronRight size={18} />
            </button>
          </div>

          <div className="drp-weekdays">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="drp-grid">
            {days.map((date) => (
              <button
                key={toYmd(date)}
                type="button"
                className={dayClass(date)}
                onClick={() => onDayClick(date)}
              >
                {date.getDate()}
              </button>
            ))}
          </div>

          <p className="drp-hint">
            {pickingEnd ? 'Select end date' : 'Select start date'}
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default DateRangePicker;
