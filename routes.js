const router = require('express').Router()
const config = require('./config')
const MessagingResponse = require('twilio').twiml.MessagingResponse
const client = require('twilio')(config.twilio_sid, config.twilio_token)
const watson = require('watson-developer-cloud')
const visualRecognition = watson.visual_recognition({
  api_key: config.watson_visual_recognition_key,
  version: 'v3',
  version_date: '2016-05-20'
})
const addResults = (resultsArray, msg) => {
  resultsArray.forEach((item, index) => {
    if (index === 0) {
      msg += item.class + ' ' + Math.round(Number(item.score) * 100).toString() + '%'
    } else if (Number(item.score) > 0.6) {
      msg += ', ' + item.class + ' ' + Math.round(Number(item.score) * 100).toString() + '%'
    }
  })
  return msg
}

const addNSFW = (resultsArray, msg) => {
  if (resultsArray[0].classes[0].class === 'SFW' && resultsArray[0].classes[0].score > 0.5) {
    return msg + '\n✅'
  } else if (resultsArray[0].classes[0].class === 'NSFW' && resultsArray[0].classes[0].score > 0.5) {
    return msg + '\n🙈'
  } else {
    return msg + '\n😳'
  }
}

router.route('/').get((req, res) => {
  res.send('homepage')
})
router.route('/api/mms').get((req, res) => {
  const twiml = new MessagingResponse()
  console.log(req.query)
  if (req.query.hasOwnProperty('MediaContentType0') && (req.query.MediaContentType0 === 'image/jpeg' || req.query.MediaContentType0 === 'image/png')) {
    const mediaID = req.query.MediaUrl0.split('/').slice(-1)[0]
    visualRecognition.classify({ url: req.query.MediaUrl0, classifier_ids: ['default', 'nsfw'] }, (err, response) => {
      if (err) { console.log(err) } else {
        console.log(JSON.stringify(response, null, 2))
        client.messages(req.query.MessageSid).media(mediaID)
        .remove()
        .then(() => {
          console.log(`removed successfully`)
        })
        let defaultClassifierResults = response.images[0].classifiers.filter(classifier => classifier.classifier_id === 'default')
        let nsfwClassifierResults = response.images[0].classifiers.filter(classifier => classifier.classifier_id === 'nsfw')
        let objectResults = defaultClassifierResults[0].classes.filter(singleClass => singleClass.class.slice(-5) !== 'color')
        let colorResults = defaultClassifierResults[0].classes.filter(singleClass => singleClass.class.slice(-5) === 'color').map(singleClass => Object.assign({}, singleClass, {class: singleClass.class.slice(0, -6)}))
        let textMessage = `Top results are: `
        textMessage = addResults(objectResults, textMessage)
        textMessage += '\nColor results are: '
        textMessage = addResults(colorResults, textMessage)
        textMessage = addNSFW(nsfwClassifierResults, textMessage)
        twiml.message(textMessage)
        res.writeHead(200, {'Content-Type': 'text/xml'})
        res.end(twiml.toString())
      }
    })
  } else {
    console.log(req.query.body)
    twiml.message('Please attach a picture for Watson Visual Recognition')
    res.writeHead(200, {'Content-Type': 'text/xml'})
    res.end(twiml.toString())
  }
})
module.exports = router
