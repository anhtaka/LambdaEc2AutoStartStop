var aws = require("aws-sdk");
var moment = require("moment");

aws.config.update({ region: "ap-northeast-1" });        //Tokyo
var NOWDATE;
//var getUrl = "https://anhtaka.github.io/holiday-node/holiday-main.json";
const AryHoliday = [];

function getHour(value) {
    return value.split(":", 2)[0];
}

function getMinute(value) {
    return value.split(":", 2)[1];
}


function stopInstance(ec2, instanceId) {
    console.log("stop EC2. id = " + instanceId);
    var params = {
        InstanceIds: [
            instanceId
        ],
    };
    ec2.stopInstances(params, function (err, data) {
        if (err) console.log(err, err.stack);
        else console.log("stop success. instance id = " + instanceId);
        //callback();
    });
}

function startInstance(ec2, instanceId) {
    console.log("start EC2. id = " + instanceId);
    var params = {
        InstanceIds: [
            instanceId
        ],
    };
    ec2.startInstances(params, function (err, data) {
        if (err) console.log(err, err.stack);
        else console.log("start success. instance id = " + instanceId);
        //callback();
    });
}

function handleInstance(state, start, end, nowhhmm) {
    // not support
    //if (start >= end) return 'not support';

    //var now = getNow();
    //var now = NOWDATE;

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

    /*
    if (now >= start && now < end) {
        console.log("running time");
        if (state === "stopped") {
            return "start";
        } else {
            console.log("state = " + state + ". nothing");
            return "nothing";
        }

    } else if (now < start || now >= end) {
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
    */
}

function validValue(key, value) {
    // null
    if (!value) {
        console.log(key + " = null or undefined");
        return false;
    }
    // 0:nothing 1:decided start end time
    if (value === "0" || value === "1") {
        return true;
    }

    // format
    if (!(value.match(/^[0-9]{1,2}:[0-9][0-9]$/))) {
        console.log("not support format. " + key + " = " + value);
        return false;
    }

    // hour
    if (24 < getHour(value) || 0 > getHour(value)) {
        console.log("not support format(hour). " + key + " = " + value);
        return false;
    }

    // minute
    if (60 < getMinute(value) || 0 > getMinute(value)) {
        console.log("not support format(minute). " + key + " = " + value);
        return false;
    }

    return true;
}
/*
function checkweekMonFri(value) {
    var flg = 0;
    switch (value) {
    case 'Monday':
    case 'Tuesday':
    case 'Wednesday':
    case 'Thursday':
    case 'Friday':
        //console.log("checkweekMonFri = Mon-Fri");
        return 1;
    case 'Saturday':
    case 'Sunday':
        //console.log("checkweekMonFri = Sat-Sun");
        return 0;
    }
}
*/
function getNow() {
    //console.log("TEST");
    return moment().utcOffset("+09:00");
}

function getDayOffBootFlg(instance, tagName){
    var tagValue = "";
    instance.Tags.forEach(function (tag) {
        if (tag.Key === tagName) tagValue = tag.Value;
    });

    console.log(tagName + " = " + tagValue);
    return tagValue;
}

function getDateValue(instance, tagName, vnowhhmm, dayoff) {
    var retValue = "";
    var tagValue =  getTagValue(instance, tagName); //--Start-Stop
    if (!(validValue(tagName, tagValue))) return "99:99";    //not suppoet format all return "99:99"

    //AutoStart-----------------------------
    if (tagName === "AutoStart") {
        if (chkHoliday(NOWDATE) === 0 || dayoff === "1") {
            //not holiday
            var autoStartDue = getTagValue(instance, "AutoStartDueDate");
            if (moment(autoStartDue, 'YYYYMMDD').isValid()){
                var autoStartDue_DATE = moment(autoStartDue, 'YYYYMMDD');
                var NOWDATE_DATE = moment(NOWDATE.format('YYYYMMDD'), 'YYYYMMDD');
                if (NOWDATE_DATE.isAfter(autoStartDue_DATE)) {
                    tagValue = '99:99';
                } else {
                    //not holiday
                    if (tagValue === "1") {
                        tagValue = "08:30";
                    } else if (tagValue === "0") {
                        tagValue = "99:99";
                    }
                }
            } else {
                tagValue = '99:99';
            }
        } else {
            //holiday
            //don't execute on Saturday, Sunday
            tagValue = "99:99";
        }
    }
    //AutoStop-----------------------------
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
    retValue = tagValue;
    return retValue;
}
function getTagValue(instance, tagName) {
    //var value = "";
    var tagValue = "";
    instance.Tags.forEach(function (tag) {
        if (tag.Key === tagName) tagValue = tag.Value;
    });
    //console.log(tagName + " = " + tagValue);
    //var value = tagValue;
    return tagValue;
}


function getMinute10(value) {
    console.log("getMinute10 from");
    var now = value.format("HH:mm");
    //console.log(now);
    //now = "9:12";
    var hour = getHour(now);

    var vmin = getMinute(now);
    var intmin = Number(vmin); //change int

    var min = "00";
    //console.log("min = " + smin);
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
/* get Holiday Json list */
/*
function httpGet(url){
    var response = request("GET",url);
    console.log("Status Code (function) : "+response.statusCode);

    var item;
    var obj = JSON.parse(response.getBody("utf8"));
    for (item in obj.holiday) {
        AryHoliday.push(obj.holiday[item].DATA);
    }
    console.log("AryHoliday="+AryHoliday);
    return response.statusCode;
}
*/
/*  getHoliday  */
function getHoliday(){
    const holidayString = process.env.holidaylist;
    if (!holidayString) {  
        console.error("Environment variable 'holidaylist' is missing.");  
        return;  
    } 
    // 文字列から余分なシングルクォーテーションを削除し、カンマで分割して配列に変換
    const  tmp = holidayString
      .split(',') // Split by comma
      .map(date => date.trim()); // 余分な空白を削除
    
    AryHoliday.push(...tmp);
  
}
/*  input:yyyy-mm-dd  */
function chkHoliday(valueDate) {
    var hFlg = 0;
    //holiday検索
    var a = AryHoliday.indexOf(valueDate.format("YYYY-MM-DD"));
    if(a == -1){
        //check week
        switch (valueDate.format("dddd")) {
        case "Monday":
        case "Tuesday":
        case "Wednesday":
        case "Thursday":
        case "Friday":
            hFlg =  0; 
            break;
        case "Saturday":
        case "Sunday":
            hFlg = 1;
            break;
        }
    }else{
        hFlg = 1; //holiday
    }
    return hFlg;
}

//-----------------------------------------------------------
// main
//-----------------------------------------------------------
exports.handler = function (event, context) {
    console.log("-----------------start.-----------------");
    NOWDATE = getNow(); //now date

    getHoliday();
    console.log('全データ:', AryHoliday);
    console.log("NOWDATE=" + NOWDATE.format("YYYY-MM-DD HH:mm dddd Z"));
    /*if (checkweekMonFri(NOWDATE.format('dddd')) === 1) {
        console.log("checkweekMonFri = Mon-Fri");
    } else {
        console.log("checkweekMonFri = Sat-Sun");
    }*/

    //nowdate = getNow();
    var ec2 = new aws.EC2();
    var nowhhmm = getMinute10(NOWDATE);
    var params;
    
    //debug
    /*
    params = {
        Filters: [
            {
                Name: 'tag-key',
                Values: ['Description']
            },
            {
                Name: 'tag-value',
                Values: ['Linux']
            },
        ]
    };
    */
    params = ""; //全てのインスタンスに対して実行
    ec2.describeInstances(params, function (err, data) {
        if (err) console.log(err, err.stack);
        else if (data.Reservations.length == 0) console.log("don't find ec2");
        else {
            //console.log(data);
            for (var i = 0; i < data.Reservations.length; i++) {
                var res = data.Reservations[i];
                var instances = res.Instances;
                for (var j = 0; j < instances.length; j++) {
                    var instanceID = instances[j].InstanceId;
                    console.log("instance " + instanceID);

                    var instance = instances[j];
                    var serName = getTagValue(instance, "Name"); //--Start
                    console.log("check instance(id = " + instance.InstanceId + "(" + serName + ")");
                    var dayoff = getDayOffBootFlg(instance, "DayOffBoot");
                    var start = getDateValue(instance, "AutoStart", nowhhmm, dayoff); //--Start
                    var end = getDateValue(instance, "AutoStop", nowhhmm); //--End
                    if (start != "" && end != "") {
                        var result = handleInstance(instance.State.Name, start, end, nowhhmm);
                        if (result === "start") {
                            startInstance(ec2, instances[j].InstanceId);
                        } else if (result === "stop") {
                            stopInstance(ec2, instances[j].InstanceId);
                        } else {
                            console.log("check handleInstance(message) = " + result + ")");
                            //callback();
                        }
                    }
                }
            }
            console.log("-----------------all done.-----------------");
        }
    });
};
