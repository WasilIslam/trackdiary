import { Chart as ChartJS } from "chart.js";
import { ACTIVITY_TYPES } from "./helper.write";

// Generate a consistent color based on an index
export const generateColor = (index, opacity = 1) => {
  const hue = (index * 137) % 360;
  return `hsla(${hue}, 70%, 50%, ${opacity})`;
};

// Prepare data for boolean activities (Yes/No)
export const prepareBooleanActivityData = (
  activity,
  entriesMap,
  days,
  yearMonth
) => {
  const [year, month] = yearMonth.split("-");

  // Count completed, not completed, and missing days
  let completed = 0;
  let notCompleted = 0;
  let missing = 0;

  days.forEach((day) => {
    const dateStr = `${year}-${month}-${day.toString().padStart(2, "0")}`;
    const entry = entriesMap[dateStr];
    const value = entry?.activities?.[activity.id];

    if (value === true) completed++;
    else if (value === false) notCompleted++;
    else missing++;
  });

  // Pie chart data
  const pieData = {
    labels: ["Yes", "No", "Not Recorded"],
    datasets: [
      {
        data: [completed, notCompleted, missing],
        backgroundColor: [
          "rgba(75, 192, 192, 0.6)",
          "rgba(255, 99, 132, 0.6)",
          "rgba(200, 200, 200, 0.6)",
        ],
        borderColor: [
          "rgba(75, 192, 192, 1)",
          "rgba(255, 99, 132, 1)",
          "rgba(200, 200, 200, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  // Line chart data
  const lineData = {
    labels: days.map((day) => day.toString()),
    datasets: [
      {
        label: activity.title,
        data: days.map((day) => {
          const dateStr = `${year}-${month}-${day.toString().padStart(2, "0")}`;
          const entry = entriesMap[dateStr];
          const value = entry?.activities?.[activity.id];
          return value === true ? 1 : value === false ? 0 : null;
        }),
        borderColor: generateColor(0),
        backgroundColor: generateColor(0, 0.2),
        fill: false,
        tension: 0.1,
        pointRadius: 4,
        pointHoverRadius: 6,
        spanGaps: true,
      },
    ],
  };

  return { pieData, lineData };
};

// Prepare data for scale activities (1-N)
export const prepareScaleActivityData = (
  activity,
  entriesMap,
  days,
  yearMonth
) => {
  const [year, month] = yearMonth.split("-");
  const max = activity.max || 5;

  // Count occurrences of each scale value
  const valueCounts = Array(max + 1).fill(0); // +1 for 0 index (not recorded)

  days.forEach((day) => {
    const dateStr = `${year}-${month}-${day.toString().padStart(2, "0")}`;
    const entry = entriesMap[dateStr];
    const value = entry?.activities?.[activity.id];

    if (value >= 1 && value <= max) {
      valueCounts[value]++;
    } else {
      valueCounts[0]++; // Not recorded
    }
  });

  // Pie chart data
  const pieLabels = ["Not Recorded"];
  for (let i = 1; i <= max; i++) {
    pieLabels.push(i.toString());
  }

  const pieData = {
    labels: pieLabels,
    datasets: [
      {
        data: valueCounts,
        backgroundColor: [
          "rgba(200, 200, 200, 0.6)",
          ...Array(max)
            .fill()
            .map((_, i) => generateColor(i, 0.6)),
        ],
        borderColor: [
          "rgba(200, 200, 200, 1)",
          ...Array(max)
            .fill()
            .map((_, i) => generateColor(i, 1)),
        ],
        borderWidth: 1,
      },
    ],
  };

  // Line chart data
  const lineData = {
    labels: days.map((day) => day.toString()),
    datasets: [
      {
        label: activity.title,
        data: days.map((day) => {
          const dateStr = `${year}-${month}-${day.toString().padStart(2, "0")}`;
          const entry = entriesMap[dateStr];
          const value = entry?.activities?.[activity.id];
          return value >= 1 && value <= max ? value : null;
        }),
        borderColor: generateColor(0),
        backgroundColor: generateColor(0, 0.2),
        fill: false,
        tension: 0.1,
        pointRadius: 4,
        pointHoverRadius: 6,
        spanGaps: true,
      },
    ],
  };

  return { pieData, lineData };
};

// Prepare data for options activities (single select)
export const prepareOptionsActivityData = (
  activity,
  entriesMap,
  days,
  yearMonth
) => {
  const [year, month] = yearMonth.split("-");
  const options = activity.options || [];

  // Count occurrences of each option
  const optionCounts = {};
  options.forEach((opt) => {
    optionCounts[opt] = 0;
  });
  optionCounts["Not Recorded"] = 0;

  days.forEach((day) => {
    const dateStr = `${year}-${month}-${day.toString().padStart(2, "0")}`;
    const entry = entriesMap[dateStr];
    const value = entry?.activities?.[activity.id];

    if (value && options.includes(value)) {
      optionCounts[value]++;
    } else {
      optionCounts["Not Recorded"]++;
    }
  });

  // Pie chart data
  const pieData = {
    labels: [...options, "Not Recorded"],
    datasets: [
      {
        data: [
          ...options.map((opt) => optionCounts[opt]),
          optionCounts["Not Recorded"],
        ],
        backgroundColor: [
          ...options.map((_, i) => generateColor(i, 0.6)),
          "rgba(200, 200, 200, 0.6)",
        ],
        borderColor: [
          ...options.map((_, i) => generateColor(i, 1)),
          "rgba(200, 200, 200, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  // Line chart data - for options, we'll create a separate line for each option
  const lineData = {
    labels: days.map((day) => day.toString()),
    datasets: options.map((option, index) => ({
      label: option,
      data: days.map((day) => {
        const dateStr = `${year}-${month}-${day.toString().padStart(2, "0")}`;
        const entry = entriesMap[dateStr];
        const value = entry?.activities?.[activity.id];
        return value === option ? 1 : 0;
      }),
      borderColor: generateColor(index),
      backgroundColor: generateColor(index, 0.2),
      fill: false,
      tension: 0.1,
      pointRadius: 4,
      pointHoverRadius: 6,
    })),
  };

  return { pieData, lineData };
};

// Prepare data for multi-select activities
export const prepareMultiSelectActivityData = (
  activity,
  entriesMap,
  days,
  yearMonth
) => {
  const [year, month] = yearMonth.split("-");
  const options = activity.options || [];

  // Count occurrences of each option
  const optionCounts = {};
  options.forEach((opt) => {
    optionCounts[opt] = 0;
  });

  let totalDaysWithData = 0;

  days.forEach((day) => {
    const dateStr = `${year}-${month}-${day.toString().padStart(2, "0")}`;
    const entry = entriesMap[dateStr];
    const values = entry?.activities?.[activity.id] || [];

    if (Array.isArray(values) && values.length > 0) {
      totalDaysWithData++;
      values.forEach((val) => {
        if (options.includes(val)) {
          optionCounts[val]++;
        }
      });
    }
  });

  // Pie chart data
  const pieData = {
    labels: options,
    datasets: [
      {
        data: options.map((opt) => optionCounts[opt]),
        backgroundColor: options.map((_, i) => generateColor(i, 0.6)),
        borderColor: options.map((_, i) => generateColor(i, 1)),
        borderWidth: 1,
      },
    ],
  };

  // Line chart data - for multi-select, we'll create a separate line for each option
  const lineData = {
    labels: days.map((day) => day.toString()),
    datasets: options.map((option, index) => ({
      label: option,
      data: days.map((day) => {
        const dateStr = `${year}-${month}-${day.toString().padStart(2, "0")}`;
        const entry = entriesMap[dateStr];
        const values = entry?.activities?.[activity.id] || [];
        return Array.isArray(values) && values.includes(option) ? 1 : 0;
      }),
      borderColor: generateColor(index),
      backgroundColor: generateColor(index, 0.2),
      fill: false,
      tension: 0.1,
      pointRadius: 4,
      pointHoverRadius: 6,
    })),
  };

  return { pieData, lineData };
};

// Prepare data for notes completion
export const prepareNotesCompletionData = (monthEntries, days) => {
  const completed = monthEntries.filter(
    (entry) => entry.note && entry.note.trim() !== ""
  ).length;
  const missing = days.length - completed;

  return {
    labels: ["Completed", "Missing"],
    datasets: [
      {
        label: "Notes Completion",
        data: [completed, missing],
        backgroundColor: ["rgba(75, 192, 192, 0.6)", "rgba(255, 99, 132, 0.6)"],
        borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 99, 132, 1)"],
        borderWidth: 1,
      },
    ],
  };
};

// Get chart options
export const getChartOptions = (title) => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: title,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };
};

// Prepare activity data based on type
export const prepareActivityData = (activity, entriesMap, days, yearMonth) => {
  switch (activity.type) {
    case ACTIVITY_TYPES.BOOLEAN:
      return prepareBooleanActivityData(activity, entriesMap, days, yearMonth);
    case ACTIVITY_TYPES.SCALE:
      return prepareScaleActivityData(activity, entriesMap, days, yearMonth);
    case ACTIVITY_TYPES.OPTIONS:
      return prepareOptionsActivityData(activity, entriesMap, days, yearMonth);
    case ACTIVITY_TYPES.MULTI_SELECT:
      return prepareMultiSelectActivityData(
        activity,
        entriesMap,
        days,
        yearMonth
      );
    default:
      return null;
  }
};
