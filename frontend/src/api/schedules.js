import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 3000,
});

/* ======================================================
   localStorage fallback — works when backend is offline
   ====================================================== */

const STORAGE_KEY = 'cal_schedules';

function getLocalSchedules() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalSchedules(schedules) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------- Schedules ---------- */

export const fetchSchedules = async (year, month) => {
  try {
    const res = await API.get('/schedules/', { params: { year, month } });
    return res.data.results || res.data || [];
  } catch {
    // Fallback: filter local schedules by year/month
    const all = getLocalSchedules();
    return all.filter((s) => {
      const d = new Date(s.start_time);
      return d.getFullYear() === Number(year) && d.getMonth() + 1 === Number(month);
    });
  }
};

export const createSchedule = async (data) => {
  try {
    const res = await API.post('/schedules/', data);
    return res.data;
  } catch {
    // Fallback: save to localStorage
    const schedules = getLocalSchedules();
    const newItem = {
      ...data,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'default_user',
      status: data.status || 'Not Started',
      mode: data.mode || 'Online',
    };
    schedules.push(newItem);
    saveLocalSchedules(schedules);
    return newItem;
  }
};

export const updateSchedule = async (id, data) => {
  try {
    const res = await API.put(`/schedules/${id}/`, data);
    return res.data;
  } catch {
    // Fallback: update in localStorage
    const schedules = getLocalSchedules();
    const idx = schedules.findIndex((s) => s.id === id);
    if (idx !== -1) {
      schedules[idx] = {
        ...schedules[idx],
        ...data,
        updated_at: new Date().toISOString(),
      };
      saveLocalSchedules(schedules);
      return schedules[idx];
    }
    throw new Error('Schedule not found');
  }
};

export const deleteSchedule = async (id) => {
  try {
    const res = await API.delete(`/schedules/${id}/`);
    return res.data;
  } catch {
    // Fallback: remove from localStorage
    const schedules = getLocalSchedules();
    const filtered = schedules.filter((s) => s.id !== id);
    saveLocalSchedules(filtered);
    return { deleted: true };
  }
};

/* ---------- Analytics ---------- */

export const fetchAnalytics = async (year, month) => {
  try {
    const res = await API.get('/analytics/', { params: { year, month } });
    return res.data;
  } catch {
    // Fallback: compute analytics from local data
    return computeLocalAnalytics(year, month);
  }
};

function computeLocalAnalytics(year) {
  const all = getLocalSchedules();
  const yearSchedules = all.filter(
    (s) => new Date(s.start_time).getFullYear() === Number(year)
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const STATUSES = ['Cancelled', 'Completed', 'In Progress', 'Not Started'];
  const PERIODS = ['past', 'current', 'future'];

  function getPeriod(s) {
    const sDate = new Date(s.start_time); sDate.setHours(0, 0, 0, 0);
    const eDate = new Date(s.end_time); eDate.setHours(0, 0, 0, 0);
    if (eDate < today) return 'past';
    if (sDate > today) return 'future';
    return 'current';
  }

  // --- Status breakdown: rows = status, cols = period × mode ---
  const status_table = STATUSES.map((status) => {
    const row = { status };
    PERIODS.forEach((period) => {
      const items = yearSchedules.filter((s) => s.status === status && getPeriod(s) === period);
      row[`${period}_online`] = items.filter((s) => s.mode === 'Online').length;
      row[`${period}_inperson`] = items.filter((s) => s.mode === 'In-Person').length;
      row[`${period}_total`] = items.length;
    });
    return row;
  });

  // --- Totals row ---
  const totals_row = { status: 'Total' };
  PERIODS.forEach((period) => {
    totals_row[`${period}_online`] = status_table.reduce((a, r) => a + r[`${period}_online`], 0);
    totals_row[`${period}_inperson`] = status_table.reduce((a, r) => a + r[`${period}_inperson`], 0);
    totals_row[`${period}_total`] = status_table.reduce((a, r) => a + r[`${period}_total`], 0);
  });

  // --- Available Days per month ---
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daysInMonth = (m) => new Date(year, m, 0).getDate();

  const available_days_summary = months.map((m, i) => {
    const total = daysInMonth(i + 1);
    const monthItems = yearSchedules.filter((s) => new Date(s.start_time).getMonth() === i);
    const bookedDates = new Set(monthItems.map((s) => new Date(s.start_time).getDate()));
    const onlineDates = new Set(monthItems.filter((s) => s.mode === 'Online').map((s) => new Date(s.start_time).getDate()));
    const inPersonDates = new Set(monthItems.filter((s) => s.mode === 'In-Person').map((s) => new Date(s.start_time).getDate()));

    // Count Saturdays and Sundays in this month
    let satCount = 0, sunCount = 0;
    for (let d = 1; d <= total; d++) {
      const day = new Date(year, i, d).getDay();
      if (day === 0) sunCount++;
      if (day === 6) satCount++;
    }

    return {
      month: m,
      available: total - bookedDates.size,
      online: onlineDates.size,
      in_person: inPersonDates.size,
      sat: satCount,
      sun: sunCount,
    };
  });

  // --- Weekly Booked Count (ISO week format YY-WW) ---
  function getWeekNumber(d) {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  }

  const weeklyMap = {};
  yearSchedules.forEach((s) => {
    const d = new Date(s.start_time);
    const yy = String(d.getFullYear()).slice(2);
    const ww = String(getWeekNumber(d)).padStart(2, '0');
    const key = `${yy}-${ww}`;
    if (!weeklyMap[key]) weeklyMap[key] = { week: key, online: 0, in_person: 0, total: 0 };
    weeklyMap[key].total++;
    if (s.mode === 'Online') weeklyMap[key].online++;
    else weeklyMap[key].in_person++;
  });
  const monthly_booked = Object.values(weeklyMap).sort((a, b) => a.week.localeCompare(b.week));

  // --- Daily Booked Count per month ---
  const daily_by_month = {};
  months.forEach((m, i) => {
    const monthItems = yearSchedules.filter((s) => new Date(s.start_time).getMonth() === i);
    if (monthItems.length === 0) return;

    const dayMap = {};
    monthItems.forEach((s) => {
      const d = new Date(s.start_time);
      const dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayName = DAY_NAMES[d.getDay()];
      if (!dayMap[dateStr]) dayMap[dateStr] = { date: dateStr, day: dayName, online: 0, in_person: 0 };
      if (s.mode === 'Online') dayMap[dateStr].online++;
      else dayMap[dateStr].in_person++;
    });
    daily_by_month[m] = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
  });

  // --- Available Dates per month (dates without any booking) ---
  const available_dates_by_month = {};
  months.forEach((m, i) => {
    const total = daysInMonth(i + 1);
    const bookedDates = new Set(
      yearSchedules
        .filter((s) => new Date(s.start_time).getMonth() === i)
        .map((s) => new Date(s.start_time).getDate())
    );
    const dates = [];
    for (let d = 1; d <= total; d++) {
      if (!bookedDates.has(d)) {
        const dt = new Date(year, i, d);
        dates.push({
          date: `${String(i + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          day: DAY_NAMES[dt.getDay()],
        });
      }
    }
    if (dates.length > 0) {
      available_dates_by_month[m] = dates;
    }
  });

  return {
    year: Number(year),
    today: today.toISOString().slice(0, 10),
    status_table,
    totals_row,
    available_days_summary,
    monthly_booked,
    daily_by_month,
    available_dates_by_month,
  };
}

export default API;
