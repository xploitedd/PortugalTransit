const InformationHandler = require('../InformationHandler');

module.exports = {
    information: new InformationHandler('http://www.transtejo.pt/', $ => {
        return new Promise((resolve, reject) => {
            var connections = {};
            var connectionNumber = 0;
            $('.tablePartidas tr').each(function(i, elem) {
                if ((i + 1) % 2 !== 0)
                    return;

                const infoElem = $(this).children('td');
                const departure_time = infoElem['0'].children[0].data;
                const from = infoElem['1'].children[0].data;
                const to = infoElem['2'].children[0].data;
                const current_status = {
                    status: infoElem['3'].children[0].data ? infoElem['3'].children[0].data : infoElem['3'].children[0].children[0].data,
                    boarding_room: (infoElem['4'].children.length) > 0 ? infoElem['4'].children[0].data : 'N/A'
                }

                connections[connectionNumber] = {
                    departure_time,
                    from,
                    to,
                    current_status
                }

                connectionNumber++;
            });
            resolve(connections);
        });
    })
}