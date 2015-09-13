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

    var wbid = 1099
    var startTime = new Date(2015, 7, 3);
    var currentTime = new Date();
    var weekDifferent = parseInt((currentTime.getTime() - startTime.getTime()) / (7 * 24 * 60 * 60 * 1000) - 1)

    var lang = req.query.lang
    var heading = {}
    var tableHeading = {}
    if (lang == 'cn') {
        lang = 'cn'
        heading = {
            'heading': '過去四週票房資料',
            'from': '由',
            'to': '至',
            'enColor': 'black',
            'cnColor': 'white'
        }
        tableHeading = {
            'rank': '排名',
            'title': '影片名稱',
            'distributor': '發行商/出品公司',
            'origin': '產地',
            'releaseDate': '開畫日期',
            'gross': '四週週票房收入(港幣)'
        }
    } else {
        lang = 'en'
        heading = {
            'heading': 'MONTHLY BOX OFFICE',
            'from': 'From',
            'to': 'To',
            'enColor': 'white',
            'cnColor': 'black'
        }
        tableHeading = {
            'rank': 'Rank',
            'title': 'File Title',
            'distributor': 'Distributor / Production Co.',
            'origin': 'Origin',
            'releaseDate': 'Release Date',
            'gross': 'Total Gross 4 Weeks (HK$)'
        }
    }

    var url_1 = 'http://www.hkfilmart.com/boxofficedetail.asp?lang=' + lang + '&wbid=' + (wbid + weekDifferent);
    var url_2 = 'http://www.hkfilmart.com/boxofficedetail.asp?lang=' + lang + '&wbid=' + (wbid + weekDifferent - 1);
    var url_3 = 'http://www.hkfilmart.com/boxofficedetail.asp?lang=' + lang + '&wbid=' + (wbid + weekDifferent - 2);
    var url_4 = 'http://www.hkfilmart.com/boxofficedetail.asp?lang=' + lang + '&wbid=' + (wbid + weekDifferent - 3);
    var url = [url_1, url_2, url_3, url_4];
    var countWeeks = 0;

    var finalArray = [];
    var date = {
        'from': '',
        'to': ''
    }

    async.each(url,
        // check the latest data
        function(item, callback) {
            http.get(item, function(res) {
                var bufferhelper = new BufferHelper();

                res.on('data', function(chunk) {
                    bufferhelper.concat(chunk);
                });

                res.on('end', function() {
                    $ = cheerio.load(iconv.decode(bufferhelper.toBuffer(), 'Big5'));
                    var $rows = $('table tr table tr').toArray();
                    if ($rows.length != 16) {
                        wbid--
                    }
                    callback()
                });

            });
        },
        // end check the latest data

        // fetch data of previous four weeks
        function(err) {

            var from = new Date(startTime.getTime() + new Date((wbid - 1099) * 7 * 24 * 60 * 60 * 1000).getTime())
            var to = new Date(startTime.getTime() + new Date((1102 - 1099) * 7 * 24 * 60 * 60 * 1000).getTime() + 6 * 24 * 60 * 60 * 1000)

            date.from = moment(from.getTime()).format('DD/MM/YYYY')
            date.to = moment(to.getTime()).format('DD/MM/YYYY')

            url_1 = 'http://www.hkfilmart.com/boxofficedetail.asp?lang=' + lang + '&wbid=' + (wbid + 1);
            url_2 = 'http://www.hkfilmart.com/boxofficedetail.asp?lang=' + lang + '&wbid=' + (wbid + 2);
            url_3 = 'http://www.hkfilmart.com/boxofficedetail.asp?lang=' + lang + '&wbid=' + (wbid + 3);
            url_4 = 'http://www.hkfilmart.com/boxofficedetail.asp?lang=' + lang + '&wbid=' + (wbid + 4);
            url = [url_1, url_2, url_3, url_4];

            async.each(url,
                function(item, callback) {
                    http.get(item, function(res) {
                        var bufferhelper = new BufferHelper();

                        res.on('data', function(chunk) {
                            bufferhelper.concat(chunk);
                        });

                        res.on('end', function() {
                            $ = cheerio.load(iconv.decode(bufferhelper.toBuffer(), 'Big5')); // for chinese version
                            var $rows = $('table tr table tr').toArray();
                            if ($rows.length == 16) { // prevent crash

                                $rows.map(function(row, i) {
                                    var cells = $(row).find('td').toArray();

                                    if (i > 2 && i < 13) {
                                        var tempArray = []

                                        cells.map(function(cell, j) {
                                            if (j > 0 && j != 6) { // ignore rank and total gross
                                                tempArray.push($(cell).text());
                                            }
                                        });

                                        finalArray.push(tempArray)
                                    }
                                });
                            }
                            callback()

                        });

                    });
                },

                function(err) {
                    var details = []
                    var gross = {}

                    for (var i = 0; i < finalArray.length; i++) {
                        if (gross[finalArray[i][0]] != undefined) {
                            gross[finalArray[i][0]] = parseInt(gross[finalArray[i][0]]) + parseInt(finalArray[i][3].toString().replace(/,/g, ''))
                        } else {
                            details.push({
                                'movie': finalArray[i][0],
                                'prodCo': finalArray[i][1],
                                'origin': finalArray[i][2],
                                'releaseDate': finalArray[i][4]
                            })
                            gross[finalArray[i][0]] = parseInt(finalArray[i][3].toString().replace(/,/g, ''))
                        }
                    }

                    for (var i = 0; i < details.length; i++) {
                        details[i]['gross'] = gross[details[i].movie]
                    }

                    details.sort(function(a, b) {
                        return parseInt(b.gross) - parseInt(a.gross);
                    });

                    for (var i = 0; i < details.length; i++) {
                        var temp = "" + gross[details[i].movie]
                        temp = temp.replace(/,/g, '')
                        temp = parseFloat(temp).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                        details[i]['gross'] = temp
                        details[i]['grossValue'] = gross[details[i].movie]
                        details[i]['unix'] = moment(details[i]['releaseDate'], "DD/MM/YYYY").unix()
                    }

                    res.render('index', {
                        details: details,
                        date: date,
                        heading: heading,
                        tableHeading: tableHeading
                    })
                }
            );
        }
    );
});

module.exports = router;