const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
var bodyParser = require('body-parser');

// Establishing a mongoDb connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//Create a 'user' Schema 
var UserSchema = new mongoose.Schema({
  username: { type: String },
  count: { type: Number },
  log: [{
    date: { type: String },
    duration: { type: Number },
    description: { type: String },
  }],
});

// Create and Save the User model
var User = mongoose.model('User', UserSchema);

//create a new user (we don't want to create _id by ourself its build in for mongodb)
app.post('/api/users', function (req, res) {
  var newUser = new User({ username: req.body.username });

  newUser.save(function (err, data) {
    if (err) {
      return console.error(err);
    } else {
      res.send({ username: data.username, _id: data._id });//returning the created user
    }
  });
});

//get all the registed users
app.get('/api/users', function (req, res) {
  User.find({}, function (err, data) {
    if (err) {
      return res.json(err);
    } else {
      return res.json(data);
    }
  });
});

//updating user object with exercise data
app.post('/api/users/:_id/exercises', function (req, res) {

  var date = new Date();

  if (req.body.date) { // if the date is not present in the request we take the current date
    date = req.body.date;
  } else {
    date = new Date().toISOString().substring(0, 10);
  }

  const id = req.params._id;
  var exercise = { // creating an object with exercise data
    date: new Date(date).toDateString(),
    duration: parseInt(req.body.duration),
    description: req.body.description,
  }

  //findByIdAndUpdate methid takes the _id as a parameter 
  // the $push is used here as we are pushing the exercise object into a array
  User.findByIdAndUpdate(id, { $push: { log: exercise } }, { new: true }, (err, user) => {

    if (user) {

      //since the data is saved successfully we update the same record again with the count property
      // the $set is used to update the count property
      User.findByIdAndUpdate(id, { $set: { count: user.log.length } }, { new: true }, (err, user) => { });

      res.json({ _id: id, username: user.username, ...exercise });
    } else {
      res.send("User doesn't exist");
    }

  });
});

app.get('/api/users/:_id/logs', (req, res) => {
  const { from, to, limit } = req.query;
  User.findById(req.params._id, function (err, user) {
    if (user) {
      let responseObject = user;

      if (from || to || limit) {

        let fromDate = new Date(0)
        let toDate = new Date()

        if (from) {
          fromDate = new Date(from)
        }

        if (to) {
          toDate = new Date(to)
        }

        fromDate = fromDate.getTime()
        toDate = toDate.getTime()

        // array filering is used to select the records inside the req.params date range
        responseObject.log = responseObject.log.filter((session) => {
          let sessionDate = new Date(session.date).getTime()

          return sessionDate >= fromDate && sessionDate <= toDate

        })

        // after the date range is returned .sile() method is used tp slice the required records
        if (limit) { 
          responseObject.log = responseObject.log.slice(0, limit)
        }

        responseObject = responseObject.toJSON()

        responseObject['from'] = new Date(from).toUTCString().substring(0, 16);
        responseObject['to'] = new Date(to).toUTCString().substring(0, 16);
        responseObject['count'] = responseObject.log.length //adding count property
        res.json(responseObject)

      } else {
        return res.json(user); // if any query parameters is given we return the full log
      }
    } else {
      res.send("user doesn't exist");
    }

  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
