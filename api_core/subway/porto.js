const InformationHandler = require('../InformationHandler');

module.exports = {
    convertLineNameToColor: function(lineName) {
        var ll = lineName.toLowerCase();
        if (ll === 'estádio do dragão - sr. de matosinhos')
            return 'Linha Azul';
        else if (ll === 'estádio do dragão - póvoa de varzim')
            return 'Linha Vermelha';
        else if (ll === 'campanhã - ismai')
            return 'Linha Verde';
        else if (ll === 'sto. ovídio - hospital s.joão')
            return 'Linha Amarela';
        else if (ll === 'estádio do dragão - aeroporto')
            return 'Linha Violeta';
        else if (ll === 'senhora da hora - fânzeres')
            return 'Linha Laranja';

        return 'NA';
    },
    information: new InformationHandler('http://www.metrodoporto.pt/', $ => {
        return new Promise((resolve, reject) => {
            var lines = {};
            $('.DestaqueRight_AREA ul li').each(function(i, elem) {
                var line_name = $(this).children('.title').text();
                var stops = line_name.split(' - ');
                lines[i] = { 
                    line_name: module.exports.convertLineNameToColor(line_name), 
                    status: $(this).children('.text').text(),
                    stops: {
                        first_stop: stops[0].toUpperCase(),
                        last_stop: stops[1].toUpperCase()
                    } 
                };
            });
            resolve(lines);
        });
    })
}