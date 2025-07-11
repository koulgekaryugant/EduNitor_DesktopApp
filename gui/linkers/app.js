const electron = require("electron");
let { PythonShell } = require("python-shell");
const { join } = require("path");
const { desktopCapturer } = require("electron");
const powerMonitor = electron.remote.powerMonitor;
const mysql = require("mysql");
const axios = require("axios");

let loop_is_stopped = true;


// #################################################### DataBase Connction ################################################################

// Connection with database
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "Final_year",
  port: 3306,
});

// Check whether the database connected or not
connection.connect((err) => {
  if (err) {
    return console.error("error: " + err.message);
  }
  console.log("Connected to MySQL Server!");
});

// ###########################################################################################################################################



// ##################################  To fetch the details from the previous page ###########################################################

// After the login the data of the user will be stored in the storage that will be fetched and stored in the variable.
var e_id = sessionStorage.getItem("e_id");
var e_name = sessionStorage.getItem("e_name");
var o_id = sessionStorage.getItem("o_id");

console.log(e_id);
console.log(e_name);
console.log(o_id);

// ########################################################################################################################################



// #############################################  TO get the date and time from the database ##############################################

// TO get both current date and time from the system
function getTimeStamp() {
  var today = new Date();
  var date =
    today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
  var time =
    today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  var dateTime = date + " " + time;

  return dateTime;
}

// TO get only the date from the current system
function getDateOnly() {
  var today = new Date();
  var date =
    today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
  return date;
}

// #######################################################################################################################################



// ###################################### TO push the system detils to the db #############################################################
function pushPowerLogsToDB(pm_status, pm_log_ts, e_id_id, o_id_id) {
  var sql =
    "INSERT INTO PowerMonitoring (pm_status, pm_log_ts, e_id_id, o_id_id) VALUES (?, ?, ?, ?)";
  connection.query(
    sql,
    [pm_status, pm_log_ts, e_id_id, o_id_id],
    function (err, result) {
      if (err) throw err;
      console.log("Number of records inserted for pm: " + result.affectedRows);
    }
  );
}

// #######################################################################################################################################



// #################################### Screenshot fuction ###########################################################################

// This used to take the screenshot 
function fullscreenScreenshot(callback, imageFormat) {
  var _this = this;
  this.callback = callback;
  imageFormat = imageFormat || "image/jpeg";

  this.handleStream = (stream) => {
    // Create hidden video tag
    var video = document.createElement("video");
    video.style.cssText = "position:absolute;top:-10000px;left:-10000px;";

    // Event connected to stream
    video.onloadedmetadata = function () {
      // Set video ORIGINAL height (screenshot)
      video.style.height = this.videoHeight + "px"; // videoHeight
      video.style.width = this.videoWidth + "px"; // videoWidth

      video.play();

      // Create canvas
      var canvas = document.createElement("canvas");
      canvas.width = this.videoWidth;
      canvas.height = this.videoHeight;
      var ctx = canvas.getContext("2d");
      // Draw video on canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (_this.callback) {
        // Save screenshot to base64
        _this.callback(canvas.toDataURL(imageFormat));
      } else {
        console.log("Need callback!");
      }

      // Remove hidden video tag
      video.remove();
      try {
        // Destroy connect to stream
        stream.getTracks()[0].stop();
      } catch (e) {}
    };

    video.srcObject = stream;
    document.body.appendChild(video);
  };

  this.handleError = function (e) {
    console.log(e);
  };

  desktopCapturer.getSources(
    { types: ["window", "screen"] },
    (_ignore, sources) => {
      for (const source of sources) {
        // Filter: main screen
        if (
          source.name === "Entire screen" ||
          source.name === "Screen 1" ||
          source.name === "Screen 2"
        ) {
          navigator.mediaDevices
            .getUserMedia({
              audio: false,
              video: {
                mandatory: {
                  chromeMediaSource: "desktop",
                  chromeMediaSourceId: source.id,
                  minWidth: 1280,
                  maxWidth: 1280,
                  minHeight: 720,
                  maxHeight: 720,
                },
              },
            })
            .then((stream) => {
              handleStream(stream);
            })
            .catch((e) => {
              handleError(e);
            });
          return;
        }
      }
    }
  );
}

// ##########################################################################################################################################

// ################################################# Login details to store in the database #################################################

// This will be called by the login loginMarkAttendance fuction which will take all the data from that fuction and store on the database.
function pushStartAttendanceLogsToDB(
  a_ip_address,
  a_time_zone,
  a_lat,
  a_long,
  e_id_id,
  o_id_id
) {
  var current_ts = Math.round(new Date().getTime() / 1000);
  var sql =
    "INSERT INTO AttendanceLogs (a_date, a_time, a_status, a_ip_address, a_time_zone, a_lat, a_long, e_id_id, o_id_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
  connection.query(
    sql,
    [
      getDateOnly(),
      current_ts,
      "1",
      a_ip_address,
      a_time_zone,
      a_lat,
      a_long,
      e_id_id,
      o_id_id,
    ],
    function (err, result) {
      if (err) throw err;
      console.log("Init Attendance done: " + result.affectedRows);
    }
  );
}

// This will store login attendance deetails with ip,time,log,lat etc . This is 1 st fuction to execute in the main fuction.
function loginMarkAttendance() {
  axios
    .get("http://ip-api.com/json/")
    .then(function (response) {
      console.log(response.data);
      // the fuction is called which will store this all data in the database.
      pushStartAttendanceLogsToDB(
        response.data.query,
        response.data.timezone,
        response.data.lat,
        response.data.lon,
        e_id,
        o_id
      );
    })
    .catch(function (error) {
      console.log(error);
    })
    .then(function () {
      // always executed
    });
}

// ##########################################################################################################################################

// ############################################ Logout details to store in the database ####################################################

// This will be called by the login logoutMarkAttendance fuction which will take all the data from that fuction and store on the database.
function pushStopAttendanceLogsToDB(
  a_ip_address,
  a_time_zone,
  a_lat,
  a_long,
  e_id_id,
  o_id_id
) {
  var current_ts = Math.round(new Date().getTime() / 1000);
  var sql =
    "INSERT INTO AttendanceLogs (a_date, a_time, a_status, a_ip_address, a_time_zone, a_lat, a_long, e_id_id, o_id_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
  connection.query(
    sql,
    [
      getDateOnly(),
      current_ts,
      "0",
      a_ip_address,
      a_time_zone,
      a_lat,
      a_long,
      e_id_id,
      o_id_id,
    ],
    function (err, result) {
      if (err) throw err;
      console.log("Logout Attendance done: " + result.affectedRows);
    }
  );
}


// this will fetch all the logout time details time,ip etc and send to store in db.
function logoutMarkAttendance() {
  axios
    .get("http://ip-api.com/json/")
    .then(function (response) {
      console.log(response.data);
      // this call the fuction to push data in to  the database
      pushStopAttendanceLogsToDB(
        response.data.query,
        response.data.timezone,
        response.data.lat,
        response.data.lon,
        e_id,
        o_id
      );
    })
    .catch(function (error) {
      console.log(error);
    })
    .then(function () {
      // always executed
    });
}
// #######################################################################################################################################


// ########################################### Main Fuction ##############################################################################

// Main fuction where after clicking on the start attendance and start monitoring the flag get 1 and then this fuction start executing.
function monitoringApp(flag) {
  var JSONObj = { e_id: e_id, o_id: o_id, flag: flag };
  const myJSON = JSON.stringify(JSONObj);

  var options = {
    scriptPath: join(__dirname, "/../engine/"),
    args: [myJSON],
  };

  console.log("flag: " + flag);

  var python_process;

  
  // if the login button get clicked then
  // ############################################################################################################################
  if (flag === "1") {
    // to make the loop true for taking the scrrenshot until the loop get false.
    loop_is_stopped = true;
    console.log("started monitoring");

    // To hide the start button and display the stop button
    document.getElementById("start").style.visibility = "hidden";
    document.getElementById("stop").style.visibility = "visible";
    document.getElementById("animationStart").style.visibility = "visible";


    // Login attendance will be called here
    // ##################################################################
    // Login attendance marking fuction execute first.
    loginMarkAttendance();
    // ##################################################################


    global.pyshell = new PythonShell("initApp.py", options);


    //fullscreenScreenshot will be called in this section.
    // ############################################################
    // TO take screen shot utill the loop become false.
    const runAsync = () => {
      if (loop_is_stopped) {
        console.log("starting async function");
        // call the fullscreenshot fuction to get the data of the screen shoot.
        fullscreenScreenshot(function (base64data) {
          var sql =
            "INSERT INTO ScreenShotsMonitoring (ssm_img, ssm_log_ts, e_id_id, o_id_id) VALUES (?, ?, ?, ?)";
          connection.query(
            sql,
            [base64data, getTimeStamp(), e_id, o_id],
            function (err, result) {
              if (err) throw err;
              console.log(result);
              console.log(
                "Number of records inserted for ssm: " + result.affectedRows
              );
            }
          );
        }, "image/png");

        // this will call again and again runasync after every 3 sec to take screenshot and store in the db untill the loop gets false.
        setTimeout(() => {
          if (loop_is_stopped) {
            let v = runAsync();
            console.log("return val", v);
          }
        }, 3000);

        return "async function return true";
      } else {
        return "async function return false";
      }
    };

    console.log("return: ", runAsync());
    // ######################################################


    // pushPowerLogsToDB will be called here.
    // ########################################################
    // Below will check the system condition like sleep,battery etc by the electron.powerMonitor and calls the pushPowerLogsToDB to store in the db.
    powerMonitor.on("suspend", () => {
      console.log("The system is going to sleep");
      // the call will be made the fuction get true
      pushPowerLogsToDB("0", getTimeStamp(), e_id, o_id);
    });

    powerMonitor.on("resume", () => {
      console.log("The system is resuming");
      // the call will be made the fuction get true
      pushPowerLogsToDB("1", getTimeStamp(), e_id, o_id);
    });

    powerMonitor.on("on-ac", () => {
      console.log("The system is on AC Power (charging)");
      // the call will be made the fuction get true
      pushPowerLogsToDB("2", getTimeStamp(), e_id, o_id);
    });

    powerMonitor.on("on-battery", () => {
      console.log("The system is on Battery Power");
      // the call will be made the fuction get true
      pushPowerLogsToDB("3", getTimeStamp(), e_id, o_id);
    });

    powerMonitor.on("shutdown", () => {
      console.log("The system is Shutting Down");
      // the call will be made the fuction get true
      pushPowerLogsToDB("4", getTimeStamp(), e_id, o_id);
    });

    powerMonitor.on("lock-screen", () => {
      console.log("The system is about to be locked");
      // the call will be made the fuction get true
      pushPowerLogsToDB("5", getTimeStamp(), e_id, o_id);
    });

    powerMonitor.on("unlock-screen", () => {
      console.log("The system is unlocked");
      // the call will be made the fuction get true
      pushPowerLogsToDB("6", getTimeStamp(), e_id, o_id);
    });
    
    // ###################################################

  } 
  //###################################################################################################################

  //  If the stop and Logout button clicked 
  // ###################################################################################################################
  else {
    console.log("stop monitoring");

    //make the loop false to stop taking the screenshots
    loop_is_stopped = false;

    // This will make the stop button get hidden and the start button get active 
    document.getElementById("start").style.visibility = "visible";
    document.getElementById("stop").style.visibility = "hidden";
    document.getElementById("animationStart").style.visibility = "hidden";

    // Remove all the powerMonitor Listeners 
    powerMonitor.removeAllListeners("suspend");
    powerMonitor.removeAllListeners("resume");
    powerMonitor.removeAllListeners("on-ac");
    powerMonitor.removeAllListeners("on-battery");
    powerMonitor.removeAllListeners("shutdown");
    powerMonitor.removeAllListeners("lock-screen");
    powerMonitor.removeAllListeners("unlock-screen");


    // LogoutMarkAttendance will be called to store the logout details 
    // #############################################################################
    logoutMarkAttendance();
    // ###########################################################################

    pyshell.end(function (err) {
      if (err) {
        console.log(err);
        console.log("ended with err");
      }
      console.log("ended with no err");
    });

    python_process = pyshell.childProcess;
    python_process.kill("SIGINT");

    let destroyPyshell = new PythonShell("destroyApp.py", options);

    destroyPyshell.end(function (err) {
      if (err) {
        console.log(err);
        console.log("ended with err");
      }
      console.log("ended with no err");
    });
  }
  // ##############################################################################################################################

}
