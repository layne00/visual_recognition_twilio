const express = require('express')
const app = express()
const router = require('./routes.js')
const bodyParser = require('body-parser')
const port = process.env.PORT || 3000
app.use(bodyParser.json())
app.use('/', router)
app.listen(port)
console.log('express server is up and listening on port ' + port)
