const messagebird = require('messagebird')(`${process.env.MSG_BIRD_KEY}`);
const cities = require('cities.json');
const cron = require('node-cron');
const Sequelize = require('sequelize')
const sequelize = new Sequelize('weatheralerts', 'lloydchambrier', null, {
  host: 'localhost',
  dialect: 'postgres',
  operatorsAliases: false,
})
const fetch = require('node-fetch')
const bodyParser = require('body-parser')
const session = require('express-session')
const SequelizeStore = require('connect-session-sequelize')(session.Store)
const bcrypt = require('bcrypt')
const express = require('express')
const app = express()
const port = 5000 ||process.env.PORT

// For todays date;
Date.prototype.today = function () { 
  return ((this.getDate() < 10)?"0":"") + this.getDate() +"/"+(((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) +"/"+ this.getFullYear();
}
// For the time now
Date.prototype.timeNow = function(){ 
  // return ((this.getHours() < 10)?"0":"") + ((this.getHours()>12)?"0"+(this.getHours()-12):this.getHours()) +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes(); 
  return (this.getHours()+":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes());
};

// EXPRESS CONFIG SETTINGS
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(session({
    store: new SequelizeStore({
        db: sequelize,
        checkExpirationInterval: 15 * 60 * 1000,
        expiration: 24 * 60 * 60 * 1000
    }),
    secret: "safe",
    saveUninitialized: true,
    resave: false
}))

// MODEL DEFINITION
const User = sequelize.define('users', {
  firstName: {
    type: Sequelize.STRING,
    allowNull: false
  },
  lastName: {
    type: Sequelize.STRING,
    allowNull: false
  },
  city: {
    type: Sequelize.STRING,
    allowNull: false
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false
  }
}, {
  timestamps: false
});

const Notification = sequelize.define('notifications', {
  phone: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  notificationTime: {
    type: Sequelize.TEXT,
    allowNull: false
  },
  city: {
    type: Sequelize.STRING,
    allowNull: false
  }
})
// TABLE RELATIONSHIPS
User.hasMany(Notification);
Notification.belongsTo(User);

// DETECT TIME & FIND MATCHING NOTIFICATIONS
cron.schedule('* * * * *', () => {
let datetime = new Date().timeNow();
console.log('cron is at work :)')
console.log(datetime)
Notification.findAll({where: {notificationTime: datetime}})
  .then(notifications =>{
    console.log(JSON.stringify(notifications))
    if(notifications.length >= 1){
      // console.log(`Match(es) found ${JSON.stringify(not)}`)
      notifications.forEach(notification => {
        const cityLocation = cities.find( city => city.name == notification.city)
        fetch(`https://api.darksky.net/forecast/${process.env.DARK_SKY_KEY}/${cityLocation.lat},${cityLocation.lng}?units=si`)
              .then(res => res.json())
              .then(json =>{
                // create if (json.code === 400) statement for error checking
                // console.log('JSON '+ JSON.stringify(json))
                const temperature = json.currently.temperature
                const summary = json.currently.summary
                const daily_data_summary = json.daily.summary
                messagebird.messages.create({
                              originator : '+31685765664',
                              recipients : [ `+31${notification.phone}` ],
                              body : `${daily_data_summary}`
                            },
                            function (err, response) {
                                  if (err) {
                                    console.log("ERROR:");
                                    console.log(err);
                                } else {
                                    console.log("SUCCESS:");
                                    console.log(response);
                                }
                            })
                    }).catch(err => console.error(err))
      })
    }
    else{
      console.log('No match(es) found :(')
    }
  })
  .catch(err => console.error(err))
})

// ROUTES
app.get('/', (req, res)=>{
  res.render('index')
})

app.get('/signup', (req, res)=>{
    res.render('signup')
})

app.post('/signup', (req, res) =>{
  const cityName = req.body.city;
  const cityLocation = cities.find( city => city.name == cityName)
  //console.log(`City match found ${JSON.stringify(cities.find( city => city.name == cityName))}`);
  
  const inputpassword = req.body.password
  const saltRounds = 11
  console.log(`req.body ${JSON.stringify(req.body)}`)
  console.log(`password ${inputpassword}`)

    bcrypt.hash(inputpassword, saltRounds).then(hash => {
        User.create({
          firstName: req.body.firstname,
          lastName: req.body.lastname,
          city: req.body.city,
          email: req.body.email,
          password: hash
        })
        .then(user =>{
          fetch(`https://api.darksky.net/forecast/${process.env.DARK_SKY_KEY}/${cityLocation.lat},${cityLocation.lng}?units=si`)
              .then(res => res.json())
              .then(json =>{
                // create if (json.code === 400) statement for error checking
                req.session.user = user;
                // console.log('JSON '+ JSON.stringify(json))
                const temperature = json.currently.temperature
                const summary = json.currently.summary
                const daily_data_summary = json.daily.summary
                const date = new Date(new Date().getTime())
                res.render('profile', {user: user, temperature: temperature, summary: summary, expect: daily_data_summary, date: date, id: req.session.user.id})
              })
        })
        .catch(err => console.error(err))
      })
})

app.post('/login', (req, res) => {
    const email = req.body.email
    const password = req.body.password

    console.log(req.body)
    // input validation
    if (password == null || password.length < 8 ||
        email == null || email.length == 0) {
        res.render('index', { loginFailed: true })
        return;
    }
    //user authentication
    User.findOne({
        where: {
            email: email
        }
    }).then((user) => {
        if (user == null) {
            res.render('index', { loginFailed: true })
        } else {
        bcrypt.compare(password, user.password)
            .then((result) => {
                if (result) {
                    const cityLocation = cities.find( city => city.name == user.city)
                    req.session.user = user;
                    fetch(`https://api.darksky.net/forecast/${process.env.DARK_SKY_KEY}/${cityLocation.lat},${cityLocation.lng}?units=si`)
                    .then(res => res.json())
                    .then(json =>{
                      // create if (json.code === 400) statement for error checking
                      req.session.user = user;
                      // console.log(`JSON ${JSON.stringify(json.currently)}`)
                      const temperature = json.currently.temperature
                      const summary = json.currently.summary
                      const daily_data_summary = json.daily.summary
                      const date = new Date(new Date().getTime())
                      res.render('profile', {user: user, temperature: temperature, summary: summary, expect: daily_data_summary, date: date, id: req.session.user.id})
                    }).catch( err => console.error(err))
                } else {
                    res.render('index', { loginFailed: true });
                }
            })
            .catch((err) => {
                console.log(err, err.stack)
              })
        }

    }).catch((err) => {
        console.log(err, err.stack)
        res.render('index', { loginFailed: true })
    })
})

app.get('/logout', (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            throw error;
        }
        res.redirect('/');
    })
})

app.get('/profile', (req, res)=>{
  if(req.session.user){
    const cityLocation = cities.find( city => city.name == req.session.user.city)
    fetch(`https://api.darksky.net/forecast/${process.env.DARK_SKY_KEY}/${cityLocation.lat},${cityLocation.lng}?units=si`)
      .then(res => res.json())
      .then(json =>{
        const temperature = json.currently.temperature
        const summary = json.currently.summary
        const daily_data_summary = json.daily.summary
        const date = new Date(new Date().getTime())
        res.render('profile', {user: req.session.user, temperature: temperature, summary: summary, expect: daily_data_summary, date: date, id: req.session.user.id})
     })
   }
   else{
    res.render('index', { loginFailed: true });
   }
})

app.get('/add-notification', (req, res)=>{
  console.log(`req.session ${JSON.stringify(req.session)}`)
  res.render('add-notification')
})
app.post('/notifications', (req, res)=>{
  console.log(`req.body ${JSON.stringify(req.body)}`)
    Notification.create({
      phone: req.body.phone,
      notificationTime: req.body.time,
      city: req.body.city,
      userId: req.session.user.id
    })
    .then(()=>{
      res.redirect(`/profile`)
    })
    .catch(err => console.error(err))
})
app.get('/notifications', (req, res)=>{
  Notification.findAll()
  .then(notifications=>{
    res.render('notifications', {notifications: notifications})
  })
  .catch(err => console.error(err))
})

sequelize.sync()
.then(()=>{
  app.listen(port, ()=>{
    let datetime = new Date().timeNow();
    console.log(`App is listening on port ${port}`)
    console.log(`running a task every minute, current time is ${datetime}`)
  })
})