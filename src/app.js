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
  monday: {
    type: Sequelize.BOOLEAN
  },
  tuesday: {
    type: Sequelize.BOOLEAN
  },
  wednesday: {
    type: Sequelize.BOOLEAN
  },
  thursday: {
    type: Sequelize.BOOLEAN
  },
  friday: {
    type: Sequelize.BOOLEAN
  },
  saturday: {
    type: Sequelize.BOOLEAN
  },
  sunday: {
    type: Sequelize.BOOLEAN
  }
})
// TABLE RELATIONSHIPS
User.hasMany(Notification);
Notification.belongsTo(User);

// ROUTES
app.get('/', (req, res)=>{
  res.render('index')
})

app.get('/signup', (req, res)=>{
  User.findAll()
  .then(users =>{
    res.render('signup', {id: users.length+1})
  })
})

app.get('/test', (req, res)=>{
  console.log(`Longitude ${req.query.longitude} and latitude ${req.query.latitude}`)
  res.send('test passed')
})

app.get('/profile/:id', (req, res)=>{
  User.findById(req.params.id)
  .then((user)=>{
    fetch(`https://api.darksky.net/forecast/${process.env.DARK_SKY_KEY}/${req.session.latitude},${req.session.longitude}`)
    .then(res => res.json())
    .then(json =>{
      const celsius = (json.currently.temperature-32)*5/9
      const summary = json.currently.summary
      const daily_data_summary = json.daily.summary
      const date = new Date(new Date().getTime())
      console.log(`Summary: ${json.currently.summary}`)
      console.log('//////////////////////')
      console.log(`Current data ${JSON.stringify(json.currently)}`)
      console.log('//////////////////////')
      console.log(`Hourly data ${JSON.stringify(json.hourly)}`)
      console.log('//////////////////////')
      console.log(`current time ${new Date(new Date().getTime())}`)
      console.log('//////////////////////')
      console.log(`Daily data ${JSON.stringify(json.daily)}`)
      console.log(new Date(json.daily.data[0].time).toString())
      res.render('profile', {user: user, temperature: celsius, summary: summary, expect: daily_data_summary, date: date})
    });

  })
  .catch(err => console.error(err))
})

app.get('/add-notification', (req, res)=>{
  console.log(`req.session ${JSON.stringify(req.session)}`)
  res.render('add-notification')
})
app.post('/notifications', (req, res)=>{
  console.log(`req.body ${JSON.stringify(req.body)}`)
  if(req.body.everyday === 'true'){
    Notification.create({
      phone: req.body.phone,
      notificationTime: req.body.time,
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true,
      userId: req.session.user.id
    })
    .then(()=>{
      res.redirect(`/profile/${req.session.user.id}`)
    })
  }
  // else if(req.body.monday === 'true') {
  //
  // }
  // else if(req.body.tuesday === 'true'){
  //
  // }
  // else if(req.body.wednesday === 'true'){
  //
  // }
  // else if(req.body.thursday === 'true') {
  //
  // }
  // else if(req.body.friday === 'true'){
  //
  // }
  // else if(req.body.saturday === 'true'){
  //
  // }
  // else if(req.body.sunday === 'true'){
  //
  // }
})
app.get('/notifications', (req, res)=>{
  Notification.findAll()
  .then(notifications=>{
    res.render('notifications', {notifications: notifications})
  })
})

app.post('/signup', (req, res) =>{

  const longitude = parseInt(req.body.longitude)
  const latitude = parseInt(req.body.latitude)

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
          req.session.user = user;
          req.session.longitude = longitude;
          req.session.latitude = latitude;
          res.redirect(`/profile/${user.id}`)
          // An alternative way to keep track of longitude and latitude
          // could be using req.session
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
                    req.session.user = user;
                    res.redirect(`/profile/${user.id}`)
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
        res.render('home', { loginFailed: true })
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
sequelize.sync()
.then(()=>{
  app.listen(port, ()=>{
    console.log(`App is listening on port ${port}`)
  })
})
