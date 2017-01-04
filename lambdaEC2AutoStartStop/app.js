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
    var now = NOWDATE;

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
            console.log("checkweekMonFri = Mon-Fri");
            return 1;
        case 'Saturday':
        case 'Sunday':
            console.log("checkweekMonFri = Sat-Sun");
            return 0;
    }
}

function getNow() {
    //console.log("TEST");
    return moment().utcOffset("+09:00");
}

function getDateValue(instance, tagName) {
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
    console.log(tagName + " = " + tagValue);
    var value = tagValue;
    return value;
}
function getMinute10(value) {
    console.log('getMinute10 from');
    var now = value.format("HH:mm");
    console.log(now);
    //now = "9:12";

    var hour = getHour(now);
    var min = getMinute(now);

    var value = "00";
    var smin = Number(min);

    console.log("min = " + smin);
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
    console.log("start");
    var NOWDATE = getNow();
    console.log("NOWDATE=" + NOWDATE.format('YYYY-MM-DD HH:mm Z'));
    if (checkweekMonFri === 0) {
        console.log("out of Mon-Fir");
        return "";
    }
    //nowdate = getNow();
    var ec2 = new aws.EC2();
    var nowhhmm = getMinute10(NOWDATE);

    params = {
        Filters: [
            {
                Name: 'tag-key',
                Values: ['Name']
            },
            {
                Name: 'tag-value',
                Values: ['zNAT_Server(Linux)']
            },
        ]
    };
    ec2.describeInstances(params, function (err, data) {
        if (err) console.log(err, err.stack);
        else if (data.Reservations.length == 0) console.log("don't find ec2");
        else {
            console.log(data);
            async.forEach(data.Reservations, function (reservation, callback) {
                var instance = reservation.Instances[0];
                console.log("check instance(id = " + instance.InstanceId + ")");
                var start = getDateValue(instance, 'AutoStart'); //--Start
                var end = getDateValue(instance, 'AutoStop'); //--End
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
                console.log('all done.');
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
