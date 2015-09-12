var express = require('express');
var router = express.Router();
var BufferHelper = require('bufferhelper');
var cheerio = require('cheerio');
var iconv = require('iconv-lite');
var async = require('async');
var http = require('http');
var moment = require('moment');

/* GET home page. */
router.get('/', function(req, res, next) {

    var url_1 = 'http://www.hkfilmart.com/boxofficedetail.asp?lang=en&wbid=1102';
    var url_2 = 'http://www.hkfilmart.com/boxofficedetail.asp?lang=en&wbid=1101';
    var url_3 = 'http://www.hkfilmart.com/boxofficedetail.asp?lang=en&wbid=1100';
    var url_4 = 'http://www.hkfilmart.com/boxofficedetail.asp?lang=en&wbid=1099';
    var url = [url_1, url_2, url_3, url_4];
    finalArray = [];

    async.each(url,
        function(item, callback) {
            http.get(item, function(res) {
                var bufferhelper = new BufferHelper();

                res.on('data', function(chunk) {
                    bufferhelper.concat(chunk);
                });

                res.on('end', function() {
                    $ = cheerio.load(iconv.decode(bufferhelper.toBuffer(), 'Big5'));
                    var $rows = $('table tr table tr').toArray();

                    $rows.map(function(row, i) {
                        var cells = $(row).find('td').toArray();

                        if (i > 2 && i < 13) {
                            var tempArray = []

                            cells.map(function(cell, j) {
                                if (j > 0 && j != 6) {
                                    tempArray.push($(cell).text());
                                }
                            });

                            finalArray.push(tempArray)
                        }
                    });

                    callback()

                });

            });
        },

        function(err) {
            var details = []
            var gross = {}

            for (var i = 0; i < finalArray.length; i++) {
                if (gross[finalArray[i][0]] != undefined) {
                    gross[finalArray[i][0]] = parseInt(gross[finalArray[i][0]]) + parseInt(finalArray[i][3].toString().replace(/,/g,'')) 
                } else {
                	details.push({'movie' : finalArray[i][0], 'prodCo': finalArray[i][1], 'origin': finalArray[i][2], 'releaseDate': finalArray[i][4] })
                    gross[finalArray[i][0]] = parseInt(finalArray[i][3].toString().replace(/,/g,''))    
                }
            }

            for (var i = 0; i < details.length; i++) {
            	details[i]['gross'] = gross[details[i].movie]
            }

	        details.sort(function(a, b) {
	            return parseInt(b.gross) - parseInt(a.gross);
	        });

	        for (var i = 0; i < details.length; i++) {
	        	var temp = ""+gross[details[i].movie]
                temp = temp.replace(/,/g,'')
                temp = parseFloat(temp).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                details[i]['gross'] = temp
                details[i]['grossValue'] = gross[details[i].movie]
                details[i]['unix'] = moment(details[i]['releaseDate'],"DD/MM/YYYY").unix()
            }

            res.render('index',{details:details})
        }
    );
});

module.exports = router;
