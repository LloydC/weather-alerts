function today() { 
    let today = new Date()
    return ((today.getDate() < 10)?"0":"") + today.getDate() +"/"+(((today.getMonth()+1) < 10)?"0":"") + (today.getMonth()+1) +"/"+ today.getFullYear()
}
// For the time now
function timeNow(){ 
  let time = new Date()
  return (time.getHours()+":"+ ((time.getMinutes() < 10)?"0":"") + time.getMinutes())
}
exports.timeNow = timeNow;
exports.today = today;