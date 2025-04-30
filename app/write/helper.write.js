// Activity Types
export const ACTIVITY_TYPES = {
  BOOLEAN: "boolean",
  SCALE: "scale",
  OPTIONS: "options",
  MULTI_SELECT: "multi_select",
};

// Activity Templates
export const ACTIVITY_TEMPLATES = [
  {
    code: "MOOD",
    title: "Mood",
    type: ACTIVITY_TYPES.SCALE,
    max: 5,
  },
  {
    code: "SLEEP",
    title: "Sleep Quality",
    type: ACTIVITY_TYPES.SCALE,
    max: 5,
  },
  {
    code: "EXERCISE",
    title: "Exercise",
    type: ACTIVITY_TYPES.BOOLEAN,
  },
  {
    code: "MEDITATION",
    title: "Meditation",
    type: ACTIVITY_TYPES.BOOLEAN,
  },
  {
    code: "WATER",
    title: "Water Intake",
    type: ACTIVITY_TYPES.SCALE,
    max: 10,
  },
  {
    code: "PRODUCTIVITY",
    title: "Productivity",
    type: ACTIVITY_TYPES.SCALE,
    max: 5,
  },
  {
    code: "STRESS",
    title: "Stress Level",
    type: ACTIVITY_TYPES.SCALE,
    max: 5,
  },
  {
    code: "ENERGY",
    title: "Energy Level",
    type: ACTIVITY_TYPES.SCALE,
    max: 5,
  },
  {
    code: "MEALS",
    title: "Meals",
    type: ACTIVITY_TYPES.OPTIONS,
    options: ["Healthy", "Mixed", "Unhealthy"],
  },
  {
    code: "SYMPTOMS",
    title: "Symptoms",
    type: ACTIVITY_TYPES.MULTI_SELECT,
    options: ["Headache", "Fatigue", "Nausea", "Dizziness", "Pain"],
  },
];

// Helper Functions
export const formatDateDisplay = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const renderActivityValue = (activity, value) => {
  if (value === undefined || value === null) return "-";

  switch (activity.type) {
    case ACTIVITY_TYPES.BOOLEAN:
      return value === true ? "✓" : "✗";

    case ACTIVITY_TYPES.SCALE:
      return value;

    case ACTIVITY_TYPES.OPTIONS:
      return value;

    case ACTIVITY_TYPES.MULTI_SELECT:
      return Array.isArray(value) ? value.length : 0;

    default:
      return "-";
  }
};

export const validateDateRange = (date) => {
  // Don't allow future dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentDate = new Date(date);
  currentDate.setHours(0, 0, 0, 0);

  if (currentDate.getTime() > today.getTime()) {
    return { valid: false, message: "Cannot select future dates" };
  }

  // Don't allow dates older than 5 days
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  fiveDaysAgo.setHours(0, 0, 0, 0);

  if (currentDate.getTime() < fiveDaysAgo.getTime()) {
    return { valid: false, message: "Cannot edit entries older than 5 days" };
  }

  return { valid: true, message: null };
};

export const getEmptyEntry = () => ({
  date: new Date().toISOString().split("T")[0],
  note: "",
  activities: {},
});

export const getCurrentMonth = () => {
  return new Date().toISOString().substring(0, 7); // YYYY-MM format
};

export const getDaysInMonth = (monthStr) => {
  const [year, month] = monthStr.split("-");
  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => i + 1);
};

export const isToday = (dateStr) => {
  return dateStr === new Date().toISOString().split("T")[0];
};

export const createEntriesMap = (entries) => {
  const map = {};
  entries.forEach((entry) => {
    map[entry.date] = entry;
  });
  return map;
};
