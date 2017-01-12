//console.log('Loading');

var aws = require('aws-sdk');
var moment = require("moment");
var async = require('async');

aws.config.update({ region: 'ap-northeast-1' });        //Tokyo
var NOWDATE;

function getHour(value) {
    return value.split(":", 2)[0];
}

function getMinute(value) {
    return value.split(":", 2)[1];
}

function stopInstance(ec2, instanceId, callback) {
    console.log("stop EC2. id = " + instanceId);
    var params = {
        InstanceIds: [
            instanceId
        ],
    };
    ec2.stopInstances(params, function (err, data) {
        if (err) console.log(err, err.stack);
        else console.log("stop success. instance id = " + instanceId);
        callback();
    });
}

function startInstance(ec2, instanceId, callback) {
    console.log("start EC2. id = " + instanceId);
    var params = {
        InstanceIds: [
            instanceId
        ],
    };
    ec2.startInstances(params, function (err, data) {
        if (err) console.log(err, err.stack);
        else console.log("start success. instance id = " + instanceId);
        callback();
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
    if (value === "0" || value === "1"){
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

function checkweekMonFri(value) {
    var flg = 0;
    switch (value) {
        case 'Monday':
        case 'Tuesday':
        case 'Wednesda':
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

function getNow() {
    //console.log("TEST");
    return moment().utcOffset("+09:00");
}

function getDateValue(instance, tagName, vnowhhmm) {
    var value = "";
    var tagValue = "";
    instance.Tags.forEach(function (tag) {
        if (tag.Key === tagName) tagValue = tag.Value;
    });
    if (!(validValue(tagName, tagValue))) return "";
    //var now = NOWDATE;//getNow();
    //var month = now.get('month') + 1;
    //var value = moment(now.get('year') + '-' + month + '-' + now.get('date') + ' ' +
    //    getHour(tagValue) + ':' + getMinute(tagValue) + ' +09:00', 'YYYY-MM-DD HH:mm Z');
    //console.log(tagName + " = " + value.format());

    //AutoStart-----------------------------
    if (tagName === "AutoStart") {
        if (checkweekMonFri(NOWDATE.format('dddd')) === 1) {
            if (tagValue === "1") {
                tagValue = "08:30";
            } else if (tagValue === "0") {
                tagValue = "99:99";
            }
        } else {
            //don't exec starday,sunday
            tagValue = "99:99";
        }
    }
    //AutoStop-----------------------------
    if (tagName === "AutoStop") {
        if (tagValue === "1") {
            if (vnowhhmm === "22:00") {
                tagValue = "22:00";
            } else {
                tagValue = "20:00";
            }
        } else if (tagValue === "0") {
            tagValue = "99:99";
        }
    }
    
    console.log(tagName + " = " + tagValue);
    var value = tagValue;
    return value;
}
function getTagValue(instance, tagName) {
    var value = "";
    var tagValue = "";
    instance.Tags.forEach(function (tag) {
        if (tag.Key === tagName) tagValue = tag.Value;
    });
    //console.log(tagName + " = " + tagValue);
    //var value = tagValue;
    return tagValue;
}


function getMinute10(value) {
    console.log('getMinute10 from');
    var now = value.format("HH:mm");
    //console.log(now);
    //now = "9:12";

    var hour = getHour(now);
    var min = getMinute(now);

    var value = "00";
    var smin = Number(min);

    //console.log("min = " + smin);
    if (smin < 10) {
        value = "00";
    } else if (smin < 20) {
        value = "10";
    } else if (smin < 30) {
        value = "20";
    } else if (smin < 40) {
        value = "30";
    } else if (smin < 50) {
        value = "40";
    } else if (smin < 60){
        value = "50";
    }

    console.log("check getMinute10 = " + hour + ":" + value + "");
    return hour + ":" + value;
}
//-----------------------------------------------------------
// main
//-----------------------------------------------------------
exports.handler = function (event, context) {
    console.log("-----------------start.-----------------");
    NOWDATE = getNow();

    console.log("NOWDATE=" + NOWDATE.format('YYYY-MM-DD HH:mm dddd Z'));
    if (checkweekMonFri(NOWDATE.format('dddd')) === 1) {
        console.log("checkweekMonFri = Mon-Fri");
        //return "";
    } else {
        console.log("checkweekMonFri = Sat-Sun");
    }

    //nowdate = getNow();
    var ec2 = new aws.EC2();
    var nowhhmm = getMinute10(NOWDATE);

    //debug
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

    params = "" //全てのインスタンスに対して実行
    ec2.describeInstances(params, function (err, data) {
        if (err) console.log(err, err.stack);
        else if (data.Reservations.length == 0) console.log("don't find ec2");
        else {
            console.log(data);
            async.forEach(data.Reservations, function (reservation, callback) {
                var instance = reservation.Instances[0];
                var serName = getTagValue(instance, 'Name'); //--Start
                console.log("check instance(id = " + instance.InstanceId + "(" + serName + ")");
                var start = getDateValue(instance, 'AutoStart', nowhhmm); //--Start
                var end = getDateValue(instance, 'AutoStop', nowhhmm); //--End
                if (start != "" && end != "") {
                    var result = handleInstance(instance.State.Name, start, end, nowhhmm);
                    if (result === "start") {
                        startInstance(ec2, instance.InstanceId, function () {
                            callback();
                        });
                    } else if (result === "stop") {
                        stopInstance(ec2, instance.InstanceId, function () {
                            callback();
                        });
                    } else {
                        console.log("check handleInstance(message) = " + result + ")");
                        callback();
                    }
                } else {
                    callback();
                }
            }, function () {
                console.log('-----------------all done.-----------------');
                context.succeed('OK');
            });
        }
    });
    //if (event != null) {
    //    console.log('event = ' + JSON.stringify(event));
    //}
    //else {
    //    console.log('No event object');

    //}

    //context.done(null, 'Hello World');  // SUCCESS with message
};
