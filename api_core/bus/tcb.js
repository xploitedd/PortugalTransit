const InformationHandler = require('../InformationHandler');

module.exports = {
    information: InformationHandler.getInformationHandler('http://www.tcbarreiro.pt/realtime', ($, json) => {
        return new Promise((resolve, reject) => {
            resolve(JSON.parse(json));
        });
    }, { method: 'POST', form: { getVehicles: true } })
}