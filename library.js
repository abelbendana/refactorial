let slot1;
let slot2;
let slot3;
let slot4;
let slot5;
let slot6;
let tabURL;
let workMonth;
let workYear;
let daysOfWeekSelected = [];
let factorialURL = "https://api.factorialhr.com";

const setUrl = async (tab) => {
  if (tab) {
    tabURL = tab.url;
  } else {
    tab = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    tabURL = tab[0].url;
  }
};

const getSlots = (mode) => {
  if (mode === 1) {
    let base = tabURL.split("?")[1].split("&");
    slot1 = base[1]?.split("=")[1];
    slot2 = base[2]?.split("=")[1];
    slot3 = base[3]?.split("=")[1];
    slot4 = base[4]?.split("=")[1];
    slot5 = base[5]?.split("=")[1];
    slot6 = base[6]?.split("=")[1];
  } else {
    slot1 = document.getElementById("input1")?.value;
    slot2 = document.getElementById("input2")?.value;
    slot3 = document.getElementById("input3")?.value;
    slot4 = document.getElementById("input4")?.value;
    slot5 = document.getElementById("input5")?.value;
    slot6 = document.getElementById("input6")?.value;
  }
};

const setMonth = () => {
  workMonth = tabURL.split("clock-in/")[1].split("/")[2];
};

const setYear = () => {
  workYear = tabURL.split("clock-in/")[1].split("/")[1];
};

const getData = async (mode, tab) => {
  await setUrl();
  getSlots(mode);
  setMonth();
  setYear();
};

const getAccessId = async () => {
  try {
    const response = await fetch(factorialURL + "/accesses", {
      method: "GET",
    });

    if (response.ok) {
      const jsonResponse = await response.json();


      for (let index = 0; index < jsonResponse.length; index++) {
        if (jsonResponse[index].current) {
          return jsonResponse[index].id;
        }
      }

      throw "Unable to find access id.";
    }
  } catch (error) {
    throw "Unable to find access id";
  }
};

const getEmployeeId = async (accessId) => {
  try {
    const response = await fetch(factorialURL + "/employees", {
      method: "GET",
    });

    if (response.ok) {
      const jsonResponse = await response.json();

      for (let index = 0; index < jsonResponse.length; index++) {
        if (jsonResponse[index].access_id === accessId) {
          return jsonResponse[index].id;
        }
      }

      throw "Unable to find user.";
    }
  } catch (error) {
    throw "Unable to find user";
  }
};

const getPeriodId = async (employeeId) => {
  try {
    const response = await fetch(
      factorialURL +
        "/attendance/periods?year=" +
        workYear +
        "&month=" +
        workMonth +
        "&employee_id=" +
        employeeId,
      {
        method: "GET",
      }
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
        "/attendance/calendar?id=" +
        employeeId +
        "&year=" +
        workYear +
        "&month=" +
        workMonth,
      {
        method: "GET",
      }
    );

    if (response.ok) {
		
      let arrayDates = [];
      const jsonResponse = await response.json();
	  
      jsonResponse.forEach((element) => {
        if (
          element.is_laborable &&
          !element.is_leave &&
          new Date(element.date) <= new Date()
        ) {
		  if(!daysOfWeekSelected.includes(new Date(element.id).getDay())) return;
          arrayDates.push(element.day);
        }
      });
      return arrayDates;
    }
  } catch (error) {
    throw error;
  }
};

const fillDays = async (days, employeeId) => {
  try {
    if (slot1 && slot2) {
      days.forEach((dayToFill) => {
        fillDay(dayToFill, slot1, slot2, employeeId);
      });
    }

    if (slot5 && slot6) {
      days.forEach((dayToFill) => {
        createBreak(dayToFill, slot5, slot6, employeeId);
      });
    }

    if (slot3 && slot4) {
      days.forEach((dayToFill) => {
        fillDay(dayToFill, slot3, slot4, employeeId);
      });
    }
  } catch (error) {
    throw error;
  }
};

const fillDay = async (dayToFill, clockIn, clockOut, employeeId) => {
  try {
	let datetimeStart = workYear + "-" + workMonth + "-" + dayToFill + "T" + clockIn + ":00-00:00";
    let datetimeEnd = workYear + "-" + workMonth + "-" + dayToFill + "T" + clockOut + ":00-00:00";
    const response = await fetch(factorialURL + "/api/v2/time/attendance", {
      body: JSON.stringify({
        clock_in: datetimeStart,
        clock_out: datetimeEnd,
		employee_id: employeeId
      }),
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json;charset=UTF-8",
      },
      method: "POST",
    });
  } catch (error) {
    throw error;
  }
};

const createBreak = async (dayToFill, clockIn, clockOut, employeeId) => {
  try {
	let datetimeStart = workYear + "-" + workMonth + "-" + dayToFill + "T" + clockIn + ":00-00:00";
    let datetimeEnd = workYear + "-" + workMonth + "-" + dayToFill + "T" + clockOut + ":00-00:00";
    const response = await fetch(factorialURL + "/api/v1/time/breaks", {
      body: JSON.stringify({
        break_start: datetimeStart,
        break_end: datetimeEnd,
		employee_id: employeeId
      }),
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json;charset=UTF-8",
      },
      method: "POST",
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
    let days_to_fill = await getDaysToFill(employee_id);
    await fillDays(days_to_fill, employee_id);
    alert("Worked hours added correctly. Refreshing.");

    chrome.tabs.reload()
  } catch (error) {
    alert("error: " + error);
  }
};

const removeSecondRow = () => {
  document.getElementById("secondRow").remove();
};

const removePauseRow = () => {
  document.getElementById("pauseRow").remove();
};

const launchScript = () => {
  main(0, null);
};

if (typeof document !== 'undefined') {
  document.addEventListener("DOMContentLoaded", () => {
    const result = document.querySelectorAll('#deleteButton')
    result[0].addEventListener('click', removePauseRow)
    result[1].addEventListener('click', removeSecondRow)

    document
      .getElementById("launchScript")
      .addEventListener("click", launchScript);
  });
}

