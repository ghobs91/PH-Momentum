var _ = require('lodash')
var url = require('url')
var async = require('async')
var request = require('request')
var pgQuery = require('pg-query')
var querybox = require('querybox')

var config = require('./config')

// database stuff
pgQuery.connectionParameters = config.db.url
var box = querybox(__dirname + '/sql', pgQuery)

// 1. get al_companies that we haven't tried to get stakeholder for
// 2. get stake_holders from angel-list
// 3. upsert them into the database
// 4. mark as fetch attempted for the company (so it won't repeat next time)


var getStakeHolderProfilesAndSave = function (companyId, entity, callback) {
  if (!entity || !entity.id) return callback(null)
  if (!entity.user || !entity.user.id) return callback(null)

  var uri = 'https://api.angel.co/1/users/' + entity.user.id
  var opts = {json: true}

  request(uri, opts, function (error, response) {
    if (error) return callback(error)
    if (!response
    || !response.body
    || !response.body.id) return callback(null)

    var twitter_handle = response.body.twitter_url
    if (response.body.twitter_url != null) {
      twitter_handle = twitter_handle
      .replace('https://', '')
      .replace('http://', '')
      .replace('www.twitter.com/', '')
      .replace('twitter.com/', '')
      .replace(/(\?|\!|\/|\#)+/, '')
    }
    if (twitter_handle == "") twitter_handle = null

    box.run('upsert-al-company-stakeholder', [
      companyId
    , response.body
    , twitter_handle
    ], callback)
  })
}

var getStakeHoldersRoles = function (companyId, callback) {
  var uri = 'https://api.angel.co/1/startup_roles'
  var opts = {
    json: true
  , qs: {
      startup_id: companyId
    }
  }

  request(uri, opts, function (error, response) {
    if (error) return callback(error)
    if (!response
    || !response.body
    || !response.body.startup_roles
    || !response.body.startup_roles.length) return callback (null)

    var validRoles = [
      'past_investor'
    , 'board_member'
    , 'founder'
    , 'advisor'
    // , 'employee'
    // , 'incubator'
    ]

    var validEntities = response.body.startup_roles.filter(function (entity) {
      return validRoles.some(function(role) {
        return (entity.role === role)
      })
    })

    async.each(validEntities
    , getStakeHolderProfilesAndSave.bind(this, companyId)
    , callback
    )
  })
}

var done = function (error, results) {
  if (error) throw error
  process.exit(0)
}

box.run('get-companies-to-get-stakeholders-for', function (error, rows) {
  if (error) return done(error)
  if (!rows || !rows.length) return done(null)

  var companyIds = _.pluck(rows, 'id')
  async.each(companyIds, getStakeHoldersRoles, done)
})