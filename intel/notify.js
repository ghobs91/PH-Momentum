var _ = require('lodash')
var url = require('url')
var async = require('async')
var Bitly = require('bitly')
var twitter = require('twitter')
var request = require('request')
var pgQuery = require('pg-query')
var querybox = require('querybox')
var moment = require('moment-timezone')

var config = require('./config')

// bitly stuff
var bitly = new Bitly(config.bitly.username, config.bitly.apiKey);

var twit = new twitter({
    consumer_key: config.twitter.consumerKey,
    consumer_secret: config.twitter.consumerSecret,
    access_token_key: config.twitter.accessTokenKey,
    access_token_secret: config.twitter.accessTokenSecret
})

var tweet = function (status, callback) {
  twit.post('/statuses/update.json'
  , {status: status}
  , function (data) {
      if (!data) return callback(null, null)
      return callback(null, data)
    }
  )
}

// database stuff
pgQuery.connectionParameters = config.db.url
var box = querybox(__dirname + '/sql', pgQuery)

// 1. find products that need to have notifications sent
//    - find largest threshold that was past and craft
//      message based on that
// 2. determine which notification to send
// 3. send notification

var THRESHOLDS = [50, 100, 200]

var TEMPLATES = {
  50: [
    '@:stakeholder: Woo, :product: is picking up some steam @producthunt - :pdhtUrl:'
  , '@:stakeholder: Nice! - :product: is climbing the charts @producthunt - :pdhtUrl:'
  , '@:stakeholder: :product: just got more than 50 votes on @producthunt - :pdhtUrl:'
  , '@:stakeholder: :product: :pdhtUrl: is in the game with 50 vote on @producthunt - sweet!'
  ]
, 100: [
    '@:stakeholder: things are getting spicy for :product: on @producthunt :pdhtUrl: lookin good :)'
  , '@:stakeholder: Boom! Past 100 votes on @producthunt :product: :pdhtUrl: - awesome!'
  , '@:stakeholder: Whoaa - :product: already got over 100 votes on @producthunt :pdhtUrl:'
  , '@:stakeholder: :product: crosses past 100 votes on @producthunt :pdhtUrl: - off to a great start!'
  ]
, 200: [
    '@:stakeholder: :product: is on fire right now on @producthunt :pdhtUrl: ;)'
  , '@:stakeholder: congrats to the team that built @ :product: killing it on @producthunt :pdhtUrl:'
  , '@:stakeholder: team must be great @ :product: :pdhtUrl: they\'re tearing it up on @producthunt'
  , '@:stakeholder: step 1. build :product: :pdhtUrl: step 2. get 200+ votes on @producthunt step 3. profit :P'
  ]
}

var done = function (error, results) {
  if (error) console.error(error)
  if (error) throw(error)
  process.exit(0)
}

var INC = 0
var triggerTweets = function (product, template, twitterHandle, callback) {
  INC = INC + 10
  return setTimeout(function () {
    bitly.shorten(product.redirect_url, 'pd.ht', function (error, response) {
      if (error) return callback(error)
      if (!response || !response.data || !response.data.url)
        return callback(null, null) //skipping sending this message due to error

      var bitlyUrl = response.data.url

      var status = template
      .replace(':stakeholder:', twitterHandle)
      .replace(':product:', product.name)
      .replace(':pdhtUrl:', bitlyUrl)

      return tweet(status, callback)
    })
  }, INC * 1000)
}

var getTodaysProducts = function () {
  // Check for products created after midnight PST
  // var timestamp = moment().tz("America/Los_Angeles");
  // console.log(timezone.format())

  box.run('get-products-for-today', [], function (error, rows) {
    if (error) return done(error)
    rows.forEach(function (product) {
      var numNotifiedFor = product.notifications_sent_for_num_votes || 0 // have notified for

      var notifyFor = null
      var maxThreshhold =_.max(THRESHOLDS.filter(function (threshold) {
        return (product.votes_count > threshold)
      }))

      if (numNotifiedFor >= maxThreshhold) return

      var templates = TEMPLATES[maxThreshhold]

      // get stakeholders for the product
      // console.log(product)

      // NOTE - not working about fault tolerance for now
      box.run('get-stakeholders-for-product', [product.id], function (error, rows) {
        if (error) return done(error)
        var twitterHandles = _.pluck(rows, 'twitter_handle')
        if (!twitterHandles || !twitterHandles.length) twitterHandles = []

        twitterHandles = twitterHandles.filter(function(handle){
          if (!handle || handle == "") return false
          return true
        })
        if (!twitterHandles || !twitterHandles.length) twitterHandles = [] //again after cleaning

        if (twitterHandles && twitterHandles.length > 0) {
          console.log(product.id, product.name, product.votes_count)
          async.each(twitterHandles, function (handle, callback) {
            triggerTweets(product, _.sample(templates), handle, callback)
          }, function (error, results) {
            if (error) return done(error)
          })
        }

        // we don't care if it fails for now, so we'll just assume everything went okay
        // and we'll save the numVotes to the notifications table
        box.run('insert-notification'
        , [product.id, product.votes_count]
        , function (error, console) {
            if (error) return done(error)
          }
        )
      })
    })
  })
}

getTodaysProducts()