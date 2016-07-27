var request = require('request').defaults({ encoding: null });
var Jimp = require('jimp');
var Twit = require('twit');
var twitterConfig = require('./twitter-config');

var Bot = new Twit(twitterConfig);

var options = {
  method: 'GET',
  json: true,
  encoding: 'utf-8',
  gzip: true,
  url: 'https://www.pollen.com/api/forecast/current/pollen/30312',
  headers: {
    'Accept-Encoding': 'gzip, deflate, sdch, br',
    'Accept-Language': 'en-US,en;q=0.8,mg;q=0.6',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://www.pollen.com/forecast/current/pollen/30312',
    'Cookie': 'ASP.NET_SessionId=3bpmcfnq35huforg5ykvlank; geo=31150; search=30312; _gat=1; _ga=GA1.2.1828981783.1468597177; session_depth=www.pollen.com%3D2%7C668625674%3D2',
    'Connection': 'keep-alive'
  }
};

request(options, function(error, response, body) {
  // period index 1 represents Today's data
  var pollenIndex = body.Location.periods[1].Index;
  var triggers = [];
  for (var i = 0; i < body.Location.periods[1].Triggers.length; i++) {
    triggers.push(body.Location.periods[1].Triggers[i].Name);
  }
  var status = 'The Pollen Index in Atlanta today is ' + pollenIndex + '. Triggers include: ' + triggers.join(', ') + '.';
  request.get('http://wwc.instacam.com/instacamimg/ATLGM/ATLGM_l.jpg', function(error, response, imageBuffer) {
    Jimp.read(new Buffer(imageBuffer))
    .then(function(image) {
      var factor = pollenIndex * pollenIndex;
      // use Jimp.RESIZE_NEAREST_NEIGHBOR algorithm for mosaic/pixelate effect
      image.scale(1 / factor, Jimp.RESIZE_NEAREST_NEIGHBOR);
      image.quality(100 - ((factor / 26) * 100));
      image.scale(factor, Jimp.RESIZE_NEAREST_NEIGHBOR);
      image.getBuffer(Jimp.MIME_JPEG, function(err, buffer) {
        console.log(err);
        Bot.post('media/upload', { media_data: new Buffer(buffer).toString('base64') }, function (err, data, response) {
          console.log(err);
          var mediaIdStr = data.media_id_string
          var meta_params = { media_id: mediaIdStr }

          Bot.post('media/metadata/create', meta_params, function (err, data, response) {
            if (!err) {
              // now we can reference the media and post a tweet (media will attach to the tweet) 
              var params = { status: status, media_ids: [mediaIdStr] }
         
              Bot.post('statuses/update', params, function (err, data, response) {
                console.log('done');
              });
            } else {
              console.log(err);
            }
          })
        })
      });
    });
  });
});