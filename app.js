import { EC2Client, DescribeInstancesCommand, StartInstancesCommand, StopInstancesCommand } from "@aws-sdk/client-ec2";
import moment from "./jstDate.js";

const ec2Client = new EC2Client(); // Region will be picked up from environment variable AWS_REGION

let NOWDATE;
const AryHoliday = [];

function getHour(value) {
    return value.split(":", 2)[0];
}

function getMinute(value) {
    return value.split(":", 2)[1];
}

async function stopInstance(instanceId) {
    console.log("stop EC2. id = " + instanceId);
    const params = {
        InstanceIds: [instanceId],
    };
    try {
        const command = new StopInstancesCommand(params);
        await ec2Client.send(command);
        console.log("stop success. instance id = " + instanceId);
    } catch (err) {
        throw err;
    }
}

async function startInstance(instanceId) {
    console.log("start EC2. id = " + instanceId);
    const params = {
        InstanceIds: [instanceId],
    };
    try {
        const command = new StartInstancesCommand(params);
        await ec2Client.send(command);
        console.log("start success. instance id = " + instanceId);
    } catch (err) {
        throw err;
    }
}

function handleInstance(state, start, end, nowhhmm) {
    if (start === nowhhmm) {
        console.log("running time");
        if (state === "stopped") {
            return "start";
        } else {
            console.log("state = " + state + ". nothing");
            return "nothing";
        }
    } else if (end === nowhhmm) {
        console.log("stopping time");
        if (state === "running") {
            return "stop";
        } else {
            console.log("state = " + state + ". nothing");
            return "nothing";
        }
    } else {
        console.log("nothing");
        return "nothing";
    }
}

function validValue(key, value) {
    if (!value) {
        console.log(key + " = null or undefined");
        return false;
    }
    if (value === "0" || value === "1") {
        return true;
    }
    if (!(value.match(/^[0-9]{1,2}:[0-9][0-9]$/))) {
        console.log("not support format. " + key + " = " + value);
        return false;
    }
    const hour = Number(getHour(value));
    const minute = Number(getMinute(value));

    if (hour >= 24 || hour < 0) {
        console.log("not support format(hour). " + key + " = " + value);
        return false;
    }
    if (minute >= 60 || minute < 0) {
        console.log("not support format(minute). " + key + " = " + value);
        return false;
    }
    return true;
}

function isValidYYYYMMDD(str) {
    if (!/^\d{8}$/.test(str)) return false;
    const y = Number(str.slice(0, 4));
    const m = Number(str.slice(4, 6));
    const d = Number(str.slice(6, 8));
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function getNow() {
    return moment(new Date());
}

function getTagValue(instance, tagName) {
    let tagValue = "";
    if (instance.Tags) {
        instance.Tags.forEach(function (tag) {
            if (tag.Key === tagName) tagValue = tag.Value;
        });
    }
    return tagValue;
}

function getDateValue(instance, tagName, vnowhhmm, dayoff) {
    let tagValue = getTagValue(instance, tagName);
    if (!(validValue(tagName, tagValue))) return "99:99";

    if (tagName === "AutoStart") {
        if (chkHoliday(NOWDATE) === 0 || dayoff === "1") {
            const autoStartDue = getTagValue(instance, "AutoStartDueDate");
            if (isValidYYYYMMDD(autoStartDue)) {
                if (NOWDATE.format("YYYYMMDD") > autoStartDue) {
                    tagValue = "99:99";
                } else {
                    if (tagValue === "1") {
                        tagValue = "08:30";
                    } else if (tagValue === "0") {
                        tagValue = "99:99";
                    }
                }
            } else {
                tagValue = "99:99";
            }
        } else {
            tagValue = "99:99";
        }
    }
    if (tagName === "AutoStop") {
        if (tagValue === "1") {
            if (vnowhhmm === "23:00") {
                tagValue = "23:00";
            } else {
                tagValue = "20:00";
            }
        } else if (tagValue === "0") {
            tagValue = "99:99";
        }
    }

    console.log(tagName + " = " + tagValue);
    return tagValue;
}

function getMinute10(value) {
    console.log("getMinute10 from");
    const now = value.format("HH:mm");
    const hour = getHour(now);
    const vmin = getMinute(now);
    const intmin = Number(vmin);

    let min = "00";
    if (intmin < 10) {
        min = "00";
    } else if (intmin < 20) {
        min = "10";
    } else if (intmin < 30) {
        min = "20";
    } else if (intmin < 40) {
        min = "30";
    } else if (intmin < 50) {
        min = "40";
    } else if (intmin < 60) {
        min = "50";
    }

    console.log("check getMinute10 = " + hour + ":" + min + "");
    return hour + ":" + min;
}

function getHoliday(){
    const holidayString = process.env.holidaylist;
    if (!holidayString) {  
        throw new Error("Environment variable 'holidaylist' is missing.");
    } 
    const tmp = holidayString
      .split(',')
      .map(date => date.trim())
      .filter(Boolean);
    
    AryHoliday.length = 0; // Clear array
    AryHoliday.push(...tmp);
}

function chkHoliday(valueDate) {
    let hFlg = 0;
    const a = AryHoliday.indexOf(valueDate.format("YYYY-MM-DD"));
    if(a == -1){
        switch (valueDate.format("dddd")) {
        case "Monday":
        case "Tuesday":
        case "Wednesday":
        case "Thursday":
        case "Friday":
            hFlg = 0; 
            break;
        case "Saturday":
        case "Sunday":
            hFlg = 1;
            break;
        }
    }else{
        hFlg = 1;
    }
    return hFlg;
}

export const handler = async (event, context) => {
    console.log("-----------------start.-----------------");
    NOWDATE = getNow();

    getHoliday();
    console.log('全データ:', AryHoliday);
    console.log("NOWDATE=" + NOWDATE.format("YYYY-MM-DD HH:mm dddd Z"));

    const nowhhmm = getMinute10(NOWDATE);
    const params = {}; // Empty params to describe all instances
    
    try {
        const command = new DescribeInstancesCommand(params);
        const data = await ec2Client.send(command);
        
        if (!data.Reservations || data.Reservations.length === 0) {
            console.log("don't find ec2");
        } else {
            const failedInstances = [];
            for (const res of data.Reservations) {
                const instances = res.Instances;
                if (!instances) continue;
                for (const instance of instances) {
                    try {
                        const instanceID = instance.InstanceId;
                        console.log("instance " + instanceID);

                        const serName = getTagValue(instance, "Name");
                        console.log("check instance(id = " + instance.InstanceId + "(" + serName + ")");
                        const dayoff = getTagValue(instance, "DayOffBoot");
                        console.log("DayOffBoot = " + dayoff);
                        const start = getDateValue(instance, "AutoStart", nowhhmm, dayoff);
                        const end = getDateValue(instance, "AutoStop", nowhhmm);

                        if (start !== "" && end !== "") {
                            const result = handleInstance(instance.State.Name, start, end, nowhhmm);
                            if (result === "start") {
                                await startInstance(instance.InstanceId);
                            } else if (result === "stop") {
                                await stopInstance(instance.InstanceId);
                            } else {
                                console.log("check handleInstance(message) = " + result + ")");
                            }
                        }
                    } catch (err) {
                        console.error("instance " + instance.InstanceId + " failed.", err);
                        failedInstances.push(instance.InstanceId);
                    }
                }
            }
            console.log("-----------------all done.-----------------");
            if (failedInstances.length > 0) {
                throw new Error(failedInstances.length + " instance(s) failed: " + failedInstances.join(", "));
            }
        }
    } catch (err) {
        console.error(err, err.stack);
        throw err;
    }
};
