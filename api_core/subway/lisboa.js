const InformationHandler = require('../InformationHandler');

module.exports = {
    line_stops: {
        AMARELA: {
            first_stop: 'RATO',
            last_stop: 'ODIVELAS'
        },
        AZUL: {
            first_stop: 'ST. APOLÓNIA',
            last_stop: 'REBOLEIRA'
        },
        VERDE: {
            first_stop: 'CAIS DO SODRÉ',
            last_stop: 'TELHEIRAS'
        },
        VERMELHA: {
            first_stop: 'S. SEBASTIÃO',
            last_stop: 'AEROPORTO'
        },
    },
    information: InformationHandler.getInformationHandler('http://app.metrolisboa.pt/status/estado_Linhas.php', $ => {
        return new Promise((resolve, reject) => {
            var lines = {};
            $('table tr').each(function(i, elem) {
                var line_name = $(this).children('td').first().children('img').attr('alt');
                var line = line_name.split(" ")[1].toUpperCase();
                lines[i] = { 
                    line_name,
                    status: $(this).children('td').next().children('ul').text(),
                    stops: module.exports.line_stops[line]
                };
            });
            resolve(lines);
        });
    })
}