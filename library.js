const FACTORIAL_URL = "https://api.factorialhr.com";

const getForceWeekDays = () => document.getElementById("forceWeekdays").checked;

const getUrlFromTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab.url;
};

const getSlots = () => {
  const [firstShiftClockIn, firstShiftClockOut] = document.querySelectorAll("#firstShift input");
  const [breakClockIn, breakClockOut] = document.querySelectorAll("#break input");
  const [secondShiftClockIn, secondShiftClockOut] = document.querySelectorAll("#secondShift input");
  return {
    firstShiftClockIn: firstShiftClockIn?.value,
    firstShiftClockOut: firstShiftClockOut?.value,
    breakClockIn: breakClockIn?.value,
    breakClockOut: breakClockOut?.value,
    secondShiftClockIn: secondShiftClockIn?.value,
    secondShiftClockOut: secondShiftClockOut?.value,
  }
};

const getMonthAndYear = (urlFromTab) => {
  const [year, month] = urlFromTab.split("clock-in/")[1].split("/");
  return {
    month,
    year
  }
};

const getTabData = async () => {
  const urlFromTab = await getUrlFromTab();
  const monthAndYear = getMonthAndYear(urlFromTab);
  const clockInAndOutInput = getSlots();

  return {
    clockInAndOutInput,
    monthAndYear
  }
};

const fetchAccessId = async () => {
  const response = await fetch(`${FACTORIAL_URL}/accesses`);

  if (response.ok) {
    const jsonResponse = await response.json();

    for (let index = 0; index < jsonResponse.length; index++) {
      if (jsonResponse[index].current) {
        return jsonResponse[index].id;
      }
    }

    throw "Unable to find access id.";
  } else {
    throw response.statusText;
  }
};

const fetchEmployeeId = async (accessId) => {
  const response = await fetch(`${FACTORIAL_URL}/employees`);

  if (response.ok) {
    const jsonResponse = await response.json();

    for (let index = 0; index < jsonResponse.length; index++) {
      if (jsonResponse[index].access_id === accessId) {
        return jsonResponse[index].id;
      }
    }

    throw "Unable to find user.";
  } else {
    throw response.statusText;
  }
};

const fetchPeriodId = async (employeeId, monthAndYear) => {
  const { year, month } = monthAndYear;

  const response = await fetch(`${FACTORIAL_URL}/attendance/periods?year=${year}&month=${month}&employee_id=${employeeId}`);

  if (response.ok) {
    const jsonResponse = await response.json();
    return jsonResponse[0].id;
  } else {
    throw response.statusText;
  }
};

const getDaysToFill = async (employeeId, monthAndYear) => {
  const { year, month } = monthAndYear;

  const response = await fetch(`${FACTORIAL_URL}/attendance/calendar?id=${employeeId}&year=${year}&month=${month}`);

  if (response.ok) {
    const arrayDates = [];
    const jsonResponse = await response.json();
    
    jsonResponse.forEach((element) => {
      if (
        (getForceWeekDays() && !isWeekend(element.date)) ||
        (element.is_laborable && !element.is_leave) &&
        new Date(element.date) <= new Date()
      ) {
        arrayDates.push(element.day);
      }
    });

    if (arrayDates.length === 0) {
      throw "There are no available dates, try with the \"Fill with weekdays\" option";
    }

    return arrayDates;
  } else {
    throw response.statusText;
  }
};

const isWeekend = (date) => {
  const instancedDate = new Date(date);
  return instancedDate.getDay() === 6 || instancedDate.getDay() === 0; // Saturday or Sunday
}

const fillDays = async (periodId, days, clockInAndOutInput) => {
  const {firstShiftClockIn, firstShiftClockOut, breakClockIn, breakClockOut, secondShiftClockIn, secondShiftClockOut} = clockInAndOutInput;

  if (firstShiftClockIn && firstShiftClockOut) {
    days.forEach((dayToFill) => {
      fillDay(periodId, dayToFill, firstShiftClockIn, firstShiftClockOut);
    });
  }
  
  if (breakClockIn && breakClockOut) {
    days.forEach((dayToFill) => {
      fillDay(periodId, dayToFill, breakClockIn, breakClockOut, false);
    });
  }
  
  if (secondShiftClockIn && secondShiftClockOut) {
    days.forEach((dayToFill) => {
      fillDay(periodId, dayToFill, secondShiftClockIn, secondShiftClockOut);
    });
  }
};

const fillDay = async (periodId, dayToFill, clockIn, clockOut, workable = true) => {
  await fetch(`${FACTORIAL_URL}/attendance/shifts`, {
    body: JSON.stringify({
      clock_in: clockIn,
      clock_out: clockOut,
      day: dayToFill,
      period_id: periodId,
      workable
    }),
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json;charset=UTF-8",
    },
    method: "POST",
  });
};

const start = async () => {
  toggleLoading(true);
  try {
    const {clockInAndOutInput, monthAndYear} = await getTabData();
    const access_id = await fetchAccessId();
    const employee_id = await fetchEmployeeId(access_id);
    const period_id = await fetchPeriodId(employee_id, monthAndYear);
    const days_to_fill = await getDaysToFill(employee_id, monthAndYear);
    await fillDays(period_id, days_to_fill, clockInAndOutInput);

    chrome.tabs.reload()
  } catch (error) {
    alert("Error: " + error);
  }
  toggleLoading(false);
};

const removeSecondShiftRow = () => {
  document.getElementById("secondShift").remove();
};

const removeBreakRow = () => {
  document.getElementById("break").remove();
};

const toggleLoading = (isLoading) => {
  const windowElement = document.getElementById('window');
  const loadingElement = document.getElementById('loader');

  const windowElementClassName = windowElement.className.split(" ");
  const loadingElementClassName = loadingElement.className.split(" ");

  if (isLoading) {
    windowElementClassName.push("hidden");
    const newLoadingClasses = loadingElementClassName.filter(value => value !== "hidden");
    
    windowElement.classList = windowElementClassName.join(" ");
    loadingElement.classList = newLoadingClasses.join(" ");
  } else {
    const newWindowElclasses = windowElementClassName.filter(value => value !== "hidden");
    loadingElementClassName.push("hidden");
    
    windowElement.classList = newWindowElclasses.join(" ");
    loadingElement.classList = loadingElementClassName.join(" ");
  }
}

const fillTimesheet = () => {
  start();
};

if (typeof document !== 'undefined') {
  document.addEventListener("DOMContentLoaded", () => {
    const [breakDeleteBtn, secondShiftDeleteBtn] = document.querySelectorAll('#deleteButton');
    breakDeleteBtn.addEventListener('click', removeBreakRow);
    secondShiftDeleteBtn.addEventListener('click', removeSecondShiftRow);
    document.getElementById("fillTimesheet").addEventListener("click", fillTimesheet);
  });
}

