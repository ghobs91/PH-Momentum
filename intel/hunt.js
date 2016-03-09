var _ = require('lodash')
var url = require('url')
var pg = require('pg.js')
var async = require('async')
var pgQuery = require('pg-query')
var querybox = require('querybox')
var request = require('request')

var config = require('./config')

pgQuery.connectionParameters = config.db.url
var box = querybox(__dirname + '/sql', pgQuery)

var saveProductInfo = function (product, callback) {
  box.run('insert-product', [
    product.id
  , product.name
  , product.tagline
  , product.created_at
  , product.day
  , product.discussion_url
  , product.redirect_url
  , null // product_url
  , product.screenshot_url
  , product.current_user
  , product.maker_inside
  , product.user
  ], callback)
}

var saveProductCounts = function (product, callback) {
  box.run('upsert-product-counts', [
    product.id
  , product.votes_count
  , product.comments_count
  ], callback)
}

var saveProductUrl = function (product, callback) {
  box.run('check-if-product-url-fetched-attempted'
  , [product.id]
  , function (error, rows) {
      if (error) return callback(error)
      if (rows.length) return callback(null)

      request.get(product.redirect_url, {followRedirect: false}, function (error, response) {
        if (error) return callback(error)
        var urlInfo = url.parse(response.headers.location)
        var uri = (urlInfo) ? urlInfo.protocol + "//" + urlInfo.hostname : null

        box.run('update-product-url', [product.id, uri], function (error, rows) {
          if (error) return callback(error)
          box.run('insert-product-url-fetch-attempt', [product.id], callback);
        })
      })
    }
  )
}

var save = function (product, callback) {
  async.series([
    saveProductInfo.bind(undefined, product)
  , saveProductCounts.bind(undefined, product)
  , saveProductUrl.bind(undefined, product)
  ], callback)
}

var done = function (error, results) {
  if (error) throw error
  process.exit(0)
}

var getForDaysAgo = function (daysAgo) {
  var url = 'https://api.producthunt.com/v1/posts'
  var opts = {
    headers: {authorization: 'Bearer ' + config.ph.token}
  , qs: {days_ago: daysAgo || 0}
  , json: true
  }

  request.get(url, opts, function (error, response) {
    if (!response
    || !response.body
    || !response.body.posts
    || !response.body.posts.length
    ) return

    async.each(response.body.posts, save, done)
  })
}

// currently only focus on today's "rising" startups
getForDaysAgo(0)