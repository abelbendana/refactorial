let slot1;
let slot2;
let slot3;
let slot4;
let slot5;
let slot6;
let tabURL;
let workMonth;
let workYear;
let factorialURL = 'https://api.factorialhr.com';

const setUrl = async (tab) => {
  if (tab) {
    tabURL = tab.url;
  } else {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    
    if (!tab) {
      throw 'Unable to find tab';
    }

    tabURL = tab.url;
  }
};

const getSlots = (mode) => {
  if (mode === 1) {
    let base = tabURL.split('?')[1].split('&');
    slot1 = base[1]?.split('=')[1];
    slot2 = base[2]?.split('=')[1];
    slot3 = base[3]?.split('=')[1];
    slot4 = base[4]?.split('=')[1];
    slot5 = base[5]?.split('=')[1];
    slot6 = base[6]?.split('=')[1];
  } else {
    slot1 = document.getElementById('input1')?.value;
    slot2 = document.getElementById('input2')?.value;
    slot3 = document.getElementById('input3')?.value;
    slot4 = document.getElementById('input4')?.value;
    slot5 = document.getElementById('input5')?.value;
    slot6 = document.getElementById('input6')?.value;
  }
};

const setMonth = () => {
  workMonth = tabURL.split('clock-in/')[1].split('/')[1];
};

const setYear = () => {
  workYear = tabURL.split('clock-in/')[1].split('/')[0];
};

const getData = async (mode, tab) => {
  await setUrl();
  getSlots(mode);
  setMonth();
  setYear();
};

const getAccessId = async () => {
  try {
    const response = await fetch(factorialURL + '/accesses', {
      method: 'GET',
    });

    if (response.ok) {
      const jsonResponse = await response.json();

      for (let index = 0; index < jsonResponse.length; index++) {
        if (jsonResponse[index].current) {
          return jsonResponse[index].id;
        }
      }

      throw 'Unable to find access id.';
    }
  } catch (error) {
    throw 'Unable to find access id';
  }
};

const getEmployeeId = async (accessId) => {
  try {
    const response = await fetch(factorialURL + '/employees', {
      method: 'GET',
    });

    if (response.ok) {
      const jsonResponse = await response.json();

      for (let index = 0; index < jsonResponse.length; index++) {
        if (jsonResponse[index].access_id === accessId) {
          return jsonResponse[index].id;
        }
      }

      throw 'Unable to find user.';
    }
  } catch (error) {
    throw 'Unable to find user';
  }
};

const getPeriodId = async (employeeId) => {
  try {
    const response = await fetch(
      factorialURL +
        '/attendance/periods?year=' +
        workYear +
        '&month=' +
        workMonth +
        '&employee_id=' +
        employeeId,
      {
        method: 'GET',
      },
    );

    if (response.ok) {
      const jsonResponse = await response.json();
      return jsonResponse[0].id;
    }
  } catch (error) {
    throw error;
  }
};

const getDaysToFill = async (employeeId) => {
  try {
    const response = await fetch(
      factorialURL +
        '/attendance/calendar?id=' +
        employeeId +
        '&year=' +
        workYear +
        '&month=' +
        workMonth,
      {
        method: 'GET',
      },
    );

    if (response.ok) {
      let arrayDates = [];
      const jsonResponse = await response.json();

      jsonResponse.forEach((element) => {
        const isWorkableDay = element.is_laborable && !element.is_leave;
        const isPastDate = new Date(element.date) <= new Date();

        if (isWorkableDay && isPastDate) {
          return arrayDates.push(element);
        }

        const isMobileOffice = element.leaves?.[0]?.name === 'Mobile Office';
        if (isMobileOffice && isPastDate) {
          arrayDates.push(element);
        }
      });

      return arrayDates;
    }
  } catch (error) {
    throw error;
  }
};

const fillDays = async (periodId, days, employeeId) => {
  try {
    if (slot1 && slot2) {
      days.forEach((day) => {
        const dayToFill = day.day;
        const dateToFill = day.date;
        fillDay(periodId, dayToFill, dateToFill, slot1, slot2);
      });
    }

    if (slot5 && slot6) {
      days.forEach((day) => {
        const dayToFill = day.day;
        const dateToFill = day.date;
        fillDay(periodId, dayToFill, dateToFill, slot5, slot6, false);
      });
    }

    if (slot3 && slot4) {
      days.forEach((day) => {
        const dayToFill = day.day;
        const dateToFill = day.date;
        fillDay(periodId, dayToFill, dateToFill, slot3, slot4);
      });
    }
  } catch (error) {
    throw error;
  }
};

const fillDay = async (
  periodId,
  dayToFill,
  dateToFill,
  clockIn,
  clockOut,
  workable = true,
) => {
  try {
    const response = await fetch(factorialURL + '/attendance/shifts', {
      body: JSON.stringify({
        clock_in: clockIn,
        clock_out: clockOut,
        day: dayToFill,
        date: dateToFill,
        period_id: periodId,
        workable,
      }),
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json;charset=UTF-8',
      },
      method: 'POST',
    });
  } catch (error) {
    throw error;
  }
};

const main = async (mode, tab) => {
  try {
    await getData(mode, tab);
    let access_id = await getAccessId();
    let employee_id = await getEmployeeId(access_id);
    let period_id = await getPeriodId(employee_id);
    let days_to_fill = await getDaysToFill(employee_id);
    await fillDays(period_id, days_to_fill, employee_id);
    alert('Worked hours added correctly. Refreshing.');

    chrome.tabs.reload();
  } catch (error) {
    alert('error: ' + error);
  }
};

const removeSecondRow = () => {
  document.getElementById('secondRow').remove();
};

const removePauseRow = () => {
  document.getElementById('pauseRow').remove();
};

const launchScript = () => {
  main(0, null);
};

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const result = document.querySelectorAll('#deleteButton');
    result[0].addEventListener('click', removePauseRow);
    result[1].addEventListener('click', removeSecondRow);

    document
      .getElementById('launchScript')
      .addEventListener('click', launchScript);
  });
}
