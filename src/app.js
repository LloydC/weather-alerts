const express = require('express')
const app = express()
const port = 5000 ||process.env.PORT

app.set('view engine', 'ejs')

app.get('/', (req, res)=>{
  res.render('index')
})

app.get('/signup', (req, res)=>{
  res.render('signup')
})

app.get('/profile', (req, res)=>{
  res.render('profile')
})

app.get('/add-notification', (req, res)=>{
  res.render('add-notification')
})

app.get('/notifications', (req, res)=>{
  res.render('notifications')
})

app.listen(port, ()=>{
  console.log(`App is listening on port ${port}`)
})
