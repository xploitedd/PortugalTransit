const request = require('request');
const cheerio = require('cheerio');

class InformationHandler {
    constructor(url, func) {
        if (typeof url !== 'string' || typeof func !== 'function')
            return;

        this._url = url;
        this._func = func;
        this._cache = {};

        setInterval(() => { this.getStatus(false); }, 60000);
    }

    async _getInfo() {
        const body = await new Promise((resolve, reject) => {
            request(this._url, (err, res, body) => {
                if (err) {
                    console.error(error);
                    reject(undefined);
                }

                resolve(body);
            });
        });

        if (!body)
            return {};

        const chh = cheerio.load(body);
        const res = await this._func(chh);
        return res;
    }

    async getStatus(from_cache = true) {
        if (from_cache && Object.keys(this._cache).length > 0)
            return this._cache;

        const info = await this._getInfo();
        this._cache = info;
        return info;
    }

}

module.exports = InformationHandler;