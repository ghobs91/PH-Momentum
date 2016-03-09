var _ = require('lodash')
var url = require('url')
var async = require('async')
var request = require('request')
var pgQuery = require('pg-query')
var querybox = require('querybox')
var google = require('googleapis')
// var google = require('google')

var config = require('./config')

// database stuff
pgQuery.connectionParameters = config.db.url
var box = querybox(__dirname + '/sql', pgQuery)

// create custom search for google
var customsearch = google.customsearch('v1')

var googleSearchAngelList = function (company, callback) {
  customsearch.cse.list({
    cx: config.google.cx
  , auth: config.google.apiKey
  , q: company
  }, function(error, response) {
    if (error) return callback(error)
    return callback(null, response.items || [])
  })
}

var getStartupById = function (id, callback) {
  var startupUrl = 'https://api.angel.co/1/startups/' + id
  request.get(startupUrl
  , {json: true}
  , function (error, response) {
      if (error) return callback(error)
      if (!response || !response.body || !response.body.id) return callback(null, null)
      return callback(null, response.body)
    }
  )
}

var getCompanyBySlug = function (slug, callback) {
  var searchSlugUrl = 'https://api.angel.co/1/search/slugs'
  request.get(searchSlugUrl
  , {
      json: true,
      qs: {query: slug}
    }
  , function (error, response) {
      if (error) return callback(error)
      if (!response || !response.body || !response.body.id) return callback(null, null)
      return getStartupById(response.body.id, callback)
    }
  )
}

var getAngelListEntityUrl = function (product, callback) {
  googleSearchAngelList(product.product_url, function (error, results) {
    if (error) return callback(error)
    if (!results || !results.length) return callback(null, null)

    var validResults = results.filter(function(result) {
      var path = result.link.replace('https://angel.co/', '')
      if (path.indexOf('/') > -1) return false
      if (path.indexOf('?') > -1) return false
      return true
    })

    if (!validResults.length) return callback(null, null)


    var companySlug = validResults[0].link.replace('https://angel.co/', '')
    getCompanyBySlug(companySlug, callback)
  })
}

var getAngelListEntity = function (product, callback) {
  getAngelListEntityUrl(product, function (error, entity) {
    if (error) return callback(error)
    if (!product.product_url) return callback(null, null)
    if (!entity || !entity.company_url) return callback(null, null)
    if (!url.parse(entity.company_url)) return callback(null, null)

    var productDomain = product.product_url
    .replace(/^(http:\/\/|https:\/\/)/, '')
    .replace(/^www\./, '')

    var entityDomain = url.parse(entity.company_url).hostname
    .replace(/^www\./, '')

    if (productDomain !== entityDomain) return callback(null, null)

    return callback(null, entity)
  })
}

var fetchAngelListEntityAndSave = function (product, callback) {
  getAngelListEntity(product, function (error, entity) {
    if (error) return callback(error)
    async.waterfall([
      // upser into al-company
      function (cb) {
        if (!entity) return cb(null, null)
        box.run('upsert-al-company', [entity.id, entity], function (error, rows) {
          if (error) return cb(error)
          if (rows.length < 0) return cb('COULD NOT INSERT AL COMPANY', null)

          return cb(null, rows[0])
        })
      }
      // insert into product-al-company
    , function(entity, cb) {
        // null entity because we tried and so next time it won't try
        if (!entity) entity = {id: null}
        box.run('insert-product-al-company'
        , [product.id, entity.id]
        , function (error, rows) {
            if (error) return cb(error)
            if (rows.length < 0) {
              return callback('COULD NOT INSERT PRODUCT AL COMPANY', null)
            }
            return callback(null)
          }
        )
      }
    ], callback)
  })
}

var done = function (error, results) {
  if (error) console.error(error)
  if (error) throw error
  process.exit(0)
}

box.run('get-products-to-get-al-companies-for', function (error, rows) {
  async.each(rows, fetchAngelListEntityAndSave, done)
})