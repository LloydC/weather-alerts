var cron = require('node-cron');

// For todays date;
Date.prototype.today = function () { 
    return ((this.getDate() < 10)?"0":"") + this.getDate() +"/"+(((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) +"/"+ this.getFullYear();
}
// For the time now
Date.prototype.timeNow = function(){ 
    return ((this.getHours() < 10)?"0":"") + ((this.getHours()>12)?(this.getHours()-12):this.getHours()) +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds() + ((this.getHours()>12)?('PM'):'AM'); 
};

cron.schedule('* * * * * *', () => {
    var datetime = new Date().today() + " @ " + new Date().timeNow();
    console.log(`running a task every second, current time is ${datetime}`);
    
  });

  cron.schedule('* * * * *', () => {
    console.log(`running a task every minute, current time is ${datetime}`)
    // query the database for any notification time that matches current time
    // if match(es) found
    //    send a notification text to every match(es)

    // ! Make sure that the format used for stored "notification time"
    // is the same format used for "current time"
    // ! 
  });