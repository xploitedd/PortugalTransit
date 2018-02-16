const request = require('request');
const cheerio = require('cheerio');

var informationHandlers = {};
class InformationHandler {
    constructor(url, func, options = {}) {
        if (typeof url !== 'string' || typeof func !== 'function')
            return;

        this._func = func;
        this._cache = {};

        if (Object.keys(options).length === 0 || !options['uri']) 
            options['uri'] = url;

        this._options = options;

        setInterval(() => { 
            console.log(`[INFO] Updating ${url} cache data!`);
            this.getStatus(false); 
        }, 120000); // 2 min

        informationHandlers[url] = this;
    }

    async _getInfo() {
        const body = await new Promise((resolve, reject) => {
            request(this._options, (err, res, body) => {
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
        const res = await this._func(chh, body);
        return res;
    }

    async getStatus(from_cache = true) {
        if (from_cache && Object.keys(this._cache).length > 0)
            return this._cache;

        const info = await this._getInfo();
        this._cache = info;
        return info;
    }

    static getInformationHandler(url, func, options = {}) {
        if (!informationHandlers[url])
            return new InformationHandler(url, func, options);

        return informationHandlers[url];
    }
}

module.exports = InformationHandler;