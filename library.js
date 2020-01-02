let slot1;
let slot2;
let slot3;
let slot4;
let tabURL;
let workMonth;
let workYear;
let factorialURL = "https://api.factorialhr.com";
let scriptButton = document.getElementById("launchScript");

if(scriptButton){

    scriptButton.onclick = function () {
        main(0, null);
    };
}

async function setUrl(tab){
    if(tab){
        tabURL = tab.url;
    }else{
        tabURL = await new Promise(resolve => {
            chrome.tabs.getSelected(null, tab => resolve(tab.url));
        });
    }
}

function getSlots(mode) {
    if(mode === 1){
        let base = tabURL.split("?")[1].split("&");
        slot1 = base[1].split("=")[1];
        slot2 = base[2].split("=")[1];
        slot3 = base[3].split("=")[1];
        slot4 = base[4].split("=")[1];
    }else{
        slot1 = document.getElementsByTagName('input')[0].value;
        slot2 = document.getElementsByTagName('input')[1].value;
        slot3 = document.getElementsByTagName('input')[2].value;
        slot4 = document.getElementsByTagName('input')[3].value;
    }
}

function setMonth() {
    workMonth = tabURL.split("clock-in/")[1].split("/")[1];
}

function setYear() {
    workYear = tabURL.split("clock-in/")[1].split("/")[0];
}

async function getData(mode, tab){
    await setUrl();
    getSlots(mode);
    setMonth();
    setYear();
}


async function main(mode, tab){
    try{
        await getData(mode, tab);
        let access_id = await getAccessId();
        let employee_id = await getEmployeeId(access_id);
        let period_id = await getPeriodId(employee_id);
        let days_to_fill = await getDaysToFill(employee_id);
        await fillDays(period_id,days_to_fill);
        alert('Worked hours added correctly. Refreshing.');
        chrome.tabs.reload();
    } catch(error) {
        alert('error: ' + error);
    }
}

async function getAccessId(){
    try{
        const response = await fetch(factorialURL + "/accesses", {
            method: "GET"
        });

        if (response.ok) {
            const jsonResponse = await response.json();

            for(let index = 0; index < jsonResponse.length; index++) {
                if(jsonResponse[index].current){
                    return jsonResponse[0].id;
                }
            }

            throw "Unable to find access id."
        }
    }catch(error) {
        throw "Unable to find access id";
    }
}

async function getEmployeeId(accessId){
    try{
        const response = await fetch(factorialURL + "/employees", {
            method: "GET"
        });

        if (response.ok) {
            const jsonResponse = await response.json();

            for(let index = 0; index < jsonResponse.length; index++) {
                if(jsonResponse[index].access_id === accessId){
                    return jsonResponse[0].id;
                }
            }

            throw "Unable to find user."
        }
    }catch(error) {
        throw "Unable to find user";
    }
}

async function getPeriodId(employeeId){
    try{
        const response = await fetch(factorialURL + "/attendance/periods?year=" + workYear + "&month=" + workMonth + "&employee_id=" + employeeId, {
            method: "GET"
        })

        if (response.ok) {
            const jsonResponse = await response.json();
            return jsonResponse[0].id;
        }
    }catch(error) {
        throw error;
    }
}

async function getDaysToFill(employeeId){
    try{
        const response = await fetch(factorialURL + "/attendance/calendar?id=" + employeeId + "&year=" + workYear + "&month=" + workMonth, {
            method: "GET"
        });

        if (response.ok) {
            let arrayDates = [];
            const jsonResponse = await response.json();
            jsonResponse.forEach(element => {
                if(element.is_laborable && !element.is_leave && new Date(element.date) <= new Date()){
                    arrayDates.push(element.day);
                }
            });
            return arrayDates;
        }
    }catch(error){
        throw error;
    }
}

async function fillDays(periodId, days){
    try{
        if(slot1 && slot2) {
            days.forEach(dayToFill => {
                fillDay(periodId, dayToFill, slot1, slot2);
            });
        }

        if(slot3 && slot4) {
            days.forEach(dayToFill => {
                fillDay(periodId, dayToFill, slot3, slot4);
            });
        }
    }catch(error){
        throw error;
    }
}

async function fillDay(periodId, dayToFill, clockIn, clockOut){
    try{
        const response =  await fetch(factorialURL + "/attendance/shifts", {
            body: JSON.stringify({
                clock_in: clockIn,
                clock_out: clockOut,
                day: dayToFill,
                period_id: periodId
            }),
            headers: {
                "Accept": "application/json, text/plain, */*",
                "Content-Type": "application/json;charset=UTF-8"
            },
            method: "POST"
        });
    }catch(error){
        throw error;
    }
}
