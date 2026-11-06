import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, Clock3, CloudSun, GripVertical, Plus, Trash2, X } from 'lucide-react';
import './style.css';

const STORAGE_KEY = 'dayline-tasks-v1';
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const fromKey = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };
const shiftDate = (date, amount) => { const result = new Date(date); result.setDate(result.getDate() + amount); return result; };
const mondayOf = (date) => shiftDate(date, -((date.getDay() + 6) % 7));
const formatDate = (date, options) => new Intl.DateTimeFormat('ru-RU', options).format(date);
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
function readTasks() {
  try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(value) ? value.filter((task) => task && typeof task.id === 'string' && typeof task.title === 'string' && typeof task.date === 'string' && typeof task.time === 'string') : []; } catch { return []; }
}

function Weather() {
  const [weather, setWeather] = useState(null);
  const [status, setStatus] = useState('loading');
  const loadWeather = async (signal) => {
    setStatus('loading');
    try {
      let cached;
      try { cached = JSON.parse(localStorage.getItem('dayline-weather-v1') || 'null'); } catch { /* cache is optional */ }
      if (cached && Number.isFinite(cached.temperature) && Date.now() - cached.timestamp < 30 * 60 * 1000 && Date.now() >= cached.timestamp) {
        setWeather(cached); setStatus('ready'); return;
      }
      let location = cached?.location;
      if (!location || Date.now() - location.timestamp >= 24 * 60 * 60 * 1000 || Date.now() < location.timestamp) {
        const locationResponse = await fetch('https://get.geojs.io/v1/ip/geo.json', { signal });
        if (!locationResponse.ok) throw new Error('Location request failed');
        const result = await locationResponse.json();
        const latitude = Number.parseFloat(result.latitude);
        const longitude = Number.parseFloat(result.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('Location unavailable');
        location = { latitude, longitude, city: result.city || '', timestamp: Date.now() };
      }
      const params = new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude), current: 'temperature_2m' });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal });
      if (!response.ok) throw new Error('Weather request failed');
      const data = await response.json();
      if (!Number.isFinite(data.current?.temperature_2m)) throw new Error('Invalid weather data');
      const result = { temperature: Math.round(data.current.temperature_2m), city: location.city, location, timestamp: Date.now() };
      try { localStorage.setItem('dayline-weather-v1', JSON.stringify(result)); } catch { /* weather still works without cache */ }
      setWeather(result);
      setStatus('ready');
    } catch (error) { if (error.name !== 'AbortError') setStatus('error'); }
  };
  useEffect(() => {
    const controller = new AbortController();
    loadWeather(controller.signal);
    return () => controller.abort();
  }, []);
  if (status === 'ready' && weather) return <span className="weather-result"><CloudSun size={18}/><span>{weather.city && <span className="weather-city">{weather.city} · </span>}{weather.temperature > 0 ? '+' : ''}{weather.temperature}°</span></span>;
  return <button className="weather-button" onClick={() => loadWeather()} disabled={status === 'loading'}><CloudSun size={18}/><span>{status === 'loading' ? 'Загрузка погоды…' : 'Повторить загрузку погоды'}</span></button>;
}

function EditableText({ value, onSave, label, multiline = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const cancelled = useRef(false);
  const finish = () => {
    if (!cancelled.current) {
      const next = draft.trim();
      if (multiline || next) onSave(next);
    }
    cancelled.current = false;
    setEditing(false);
  };
  const onKeyDown = (event) => {
    if (event.key === 'Escape') { cancelled.current = true; event.currentTarget.blur(); }
    if (event.key === 'Enter' && (!multiline || event.ctrlKey || event.metaKey)) { event.preventDefault(); event.currentTarget.blur(); }
  };
  if (editing) {
    const props = { autoFocus: true, value: draft, onChange: (event) => setDraft(event.target.value), onBlur: finish, onKeyDown, 'aria-label': label, maxLength: multiline ? 300 : 120, className: `inline-editor ${multiline ? 'description-editor' : 'title-editor'}` };
    return multiline ? <textarea {...props} rows={3}/> : <input {...props}/>;
  }
  return <button type="button" className={`editable-text ${multiline ? 'editable-description' : 'editable-title'} ${!value ? 'editable-placeholder' : ''}`} onClick={() => { setDraft(value || ''); setEditing(true); }} aria-label={`${label}: ${value || 'добавить'}`}>{value || 'Добавить описание'}</button>;
}

function App() {
  const [tasks, setTasks] = useState(readTasks);
  const [selected, setSelected] = useState(() => dateKey(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(selected);
  const [time, setTime] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [, setDraggedId] = useState(null);
  const [dropDate, setDropDate] = useState(null);
  const titleRef = useRef(null);
  const dragRef = useRef(null);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); setStorageError(false); } catch { setStorageError(true); } }, [tasks]);
  useEffect(() => { if (!modalOpen) return; titleRef.current?.focus(); const onKey = (event) => { if (event.key === 'Escape') setModalOpen(false); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [modalOpen]);
  const selectedDate = fromKey(selected);
  const today = dateKey(new Date());
  const days = Array.from({ length: 7 }, (_, index) => shiftDate(mondayOf(selectedDate), index));
  const dayTasks = tasks.filter((task) => task.date === selected).sort((a, b) => a.time && b.time ? a.time.localeCompare(b.time) : a.time ? -1 : b.time ? 1 : 0);
  const completed = dayTasks.filter((task) => task.done).length;
  const isOverdue = (task) => !task.done && (task.time ? new Date(`${task.date}T${task.time}:00`).getTime() < Math.floor(now / 60000) * 60000 : task.date < dateKey(new Date(now)));
  const nextTaskId = dayTasks.find((task) => !task.done && !isOverdue(task))?.id;
  const openModal = () => { const todayKey = dateKey(new Date()); const initialDate = selected < todayKey ? todayKey : selected; setTitle(''); setDescription(''); setDate(initialDate); setTime(''); setModalOpen(true); };
  const addTask = (event) => { event.preventDefault(); const cleanTitle = title.trim(); if (!cleanTitle || !date || date < dateKey(new Date())) return; setTasks((current) => [...current, { id: crypto.randomUUID(), title: cleanTitle, description: description.trim(), date, time, done: false }]); setSelected(date); setModalOpen(false); };
  const updateTask = (id) => setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  const moveTask = (id, targetDate) => { if (!targetDate || targetDate < dateKey(new Date())) return; setTasks((current) => current.map((task) => task.id === id ? { ...task, date: targetDate } : task)); setDraggedId(null); setDropDate(null); };
  const startDrag = (event, task) => {
    if (event.button !== 0 || event.target.closest('button, input, label')) return;
    const handle = event.currentTarget;
    const card = handle.closest('.task-card');
    const rect = card.getBoundingClientRect();
    dragRef.current = { id: task.id, card, rect, startX: event.clientX, startY: event.clientY, preview: null, target: null };
    handle.setPointerCapture(event.pointerId);
  };
  const updateDrag = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.preview && Math.hypot(dx, dy) < 5) return;
    if (!drag.preview) {
      const preview = drag.card.cloneNode(true);
      preview.classList.add('drag-preview');
      if (drag.card.closest('.featured')) preview.classList.add('preview-featured');
      if (drag.card.closest('.overdue')) preview.classList.add('preview-overdue');
      Object.assign(preview.style, { width: `${drag.rect.width}px`, height: `${drag.rect.height}px`, left: `${drag.rect.left}px`, top: `${drag.rect.top}px` });
      document.body.appendChild(preview);
      drag.preview = preview;
      drag.card.classList.add('drag-source');
      setDraggedId(drag.id);
    }
    drag.preview.style.transform = `translate(${dx}px, ${dy}px)`;
    const day = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-drop-date]');
    const target = day?.dataset.dropDate;
    drag.target = target && target >= dateKey(new Date()) ? target : null;
    setDropDate(drag.target);
  };
  const endDrag = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.preview?.remove();
    drag.card.classList.remove('drag-source');
    dragRef.current = null;
    if (event.type !== 'pointercancel' && drag.preview && drag.target) moveTask(drag.id, drag.target);
    else { setDraggedId(null); setDropDate(null); }
  };
  const updateText = (id, field, value) => setTasks((current) => current.map((task) => task.id === id ? { ...task, [field]: value } : task));
  const updateTime = (id, time) => setTasks((current) => current.map((task) => task.id === id ? { ...task, time } : task));
  const deleteTask = (id) => setTasks((current) => current.filter((task) => task.id !== id));
  const heading = selected === today ? 'Сегодня' : capitalize(formatDate(selectedDate, { day: 'numeric', month: 'long' }));
  return <div className="page-shell"><main className="app">
    <header className="topbar"><a className="brand" href="#top" aria-label="День за днём, главная"><span className="brand-mark"><Check size={15} strokeWidth={3}/></span><span>день за днём<span className="brand-dot">.</span></span></a><Weather/></header>
    <div className="content" id="top">
    <section className="planner" aria-label="Планировщик задач"><div className="planner-header"><div><h2>{heading}<span className="heading-dot">.</span></h2><p>{capitalize(formatDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' }))}</p></div><button className="today-button" onClick={() => setSelected(today)}>Сегодня <ArrowRight size={15}/></button></div>
      <div className="week-header"><div className="month-label">{capitalize(formatDate(selectedDate, { month: 'long', year: 'numeric' }))} <ChevronDown size={15}/></div><div className="week-actions"><button aria-label="Предыдущая неделя" onClick={() => setSelected(dateKey(shiftDate(selectedDate, -7)))}><ArrowLeft size={17}/></button><button aria-label="Следующая неделя" onClick={() => setSelected(dateKey(shiftDate(selectedDate, 7)))}><ArrowRight size={17}/></button></div></div>
      <div className="week" role="group" aria-label="Выберите день">{days.map((day) => { const key = dateKey(day); const hasTasks = tasks.some((task) => task.date === key); return <button key={key} className={`day ${key === selected ? 'selected' : ''} ${dropDate === key ? 'drop-target' : ''}`} data-drop-date={key} onClick={() => setSelected(key)} aria-pressed={key === selected} aria-label={formatDate(day, { weekday: 'long', day: 'numeric', month: 'long' })}><span>{formatDate(day, { weekday: 'short' }).replace('.', '')}</span><strong>{day.getDate()}</strong><i className={hasTasks ? 'has-tasks' : ''}/></button>; })}</div>
      <div className="divider"/><div className="timeline-heading"><div><h3>Задачи</h3></div><span className="task-count">{completed} / {dayTasks.length} выполнено</span></div>
      {dayTasks.length ? <div className="timeline">{dayTasks.map((task) => <article className={`task ${task.done ? 'done' : ''} ${isOverdue(task) ? 'overdue' : ''} ${task.id === nextTaskId ? 'featured' : ''}`} key={task.id}><div className="timeline-point"><span/></div><div className="task-card"><span className="drag-handle" aria-label="Перетащить задачу" onPointerDown={(event) => startDrag(event, task)} onPointerMove={updateDrag} onPointerUp={endDrag} onPointerCancel={endDrag}><GripVertical size={17}/></span><button className="check-button" onClick={() => updateTask(task.id)} aria-label={task.done ? `Отметить «${task.title}» невыполненной` : `Отметить «${task.title}» выполненной`} aria-pressed={!!task.done}>{task.done && <Check size={15} strokeWidth={3}/>}</button><div className="task-content"><div className="task-top"><EditableText value={task.title} label="Изменить название" onSave={(value) => updateText(task.id, 'title', value)}/><label className="task-time" title="Изменить время"><Clock3 size={14}/><input type="time" value={task.time} onChange={(event) => updateTime(task.id, event.target.value)} aria-label={`Изменить время задачи «${task.title}»`}/></label></div><EditableText value={task.description} multiline label="Изменить описание" onSave={(value) => updateText(task.id, 'description', value)}/><span className="task-status">{task.done ? 'ВЫПОЛНЕНО' : isOverdue(task) ? 'ПРОСРОЧЕНО' : 'ЗАПЛАНИРОВАНО'}</span></div><button className="delete-button" onClick={() => deleteTask(task.id)} aria-label={`Удалить задачу «${task.title}»`}><Trash2 size={17}/></button></div></article>)}</div> : <div className="empty-state"><div className="empty-icon"><CalendarDays size={24}/></div><h4>На этот день задач нет</h4></div>}
      <div className="planner-footer"><button className="add-button" onClick={openModal}><Plus size={19}/> <span>Новая задача</span></button></div>
    </section></div>
    {storageError && <div className="storage-error" role="alert">Не удалось сохранить задачи в браузере. Проверьте настройки хранилища.</div>}
    {modalOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-top"><div><h2 id="modal-title">Новая задача<span className="heading-dot">.</span></h2></div><button className="close-button" onClick={() => setModalOpen(false)} aria-label="Закрыть"><X size={21}/></button></div><form onSubmit={addTask}><label>Название <span>*</span><input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, утренняя прогулка" maxLength={120} required/></label><label>Описание <span className="optional">необязательно</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Добавьте немного деталей" maxLength={300} rows="3"/></label><div className="form-row"><label>Дата <span>*</span><input type="date" min={dateKey(new Date())} value={date} onChange={(e) => setDate(e.target.value)} required/></label><label>Время <span className="optional">необязательно</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)}/></label></div><button className="submit-button" type="submit"><Plus size={19}/> Добавить в планы</button></form></section></div>}
  </main></div>;
}

createRoot(document.getElementById('root')).render(<App/>);
