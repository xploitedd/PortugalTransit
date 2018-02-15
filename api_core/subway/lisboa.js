const InformationHandler = require('../InformationHandler');

module.exports = {
    lineStops: {
        AMARELA: {
            firstStop: 'RATO',
            lastStop: 'ODIVELAS'
        },
        AZUL: {
            firstStop: 'ST. APOLÓNIA',
            lastStop: 'REBOLEIRA'
        },
        VERDE: {
            firstStop: 'CAIS DO SODRÉ',
            lastStop: 'TELHEIRAS'
        },
        VERMELHA: {
            firstStop: 'S. SEBASTIÃO',
            lastStop: 'AEROPORTO'
        },
    },
    information: new InformationHandler('http://app.metrolisboa.pt/status/estado_Linhas.php', ($) => {
        return new Promise((resolve, reject) => {
            var lines = {};
            $('table tr').each(function(i, elem) {
                var lineName = $(this).children('td').first().children('img').attr('alt');
                var line = lineName.split(" ")[1].toUpperCase();
                lines[i] = { 
                    lineName: lineName,
                    status: $(this).children('td').next().children('ul').text(),
                    stops: module.exports.lineStops[line]
                };
                resolve(lines);
            });
        });
    })
}