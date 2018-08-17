import { TransportScraper } from './scraper/TransportScraper';
import WebServer from './webserver'
import Twitter from './twitter/Twitter'
import fs from 'fs'
import Emails, { MailjetAuth } from './emails';
import { TwitterAuth } from './twitter/Interfaces';
import redis from 'redis'

export interface ConfigFile {
    twitter: TwitterAuth & 'enable_twitter'
    mailjet: MailjetAuth & { [key: string]: any }
    redis: { [key: string]: any }
    port: number
}

fs.readFile('config.json', (err, data) => {
    if (err)
        return exit(err.message)

    try {
        const d: ConfigFile = JSON.parse(data.toString())

        const enableTwitter = d.twitter.enable_twitter
        let tw: Twitter
        if (enableTwitter)
            tw = new Twitter(d.twitter)

        const mja: MailjetAuth = d.mailjet
        const mail = new Emails(mja, d.mailjet.from, d.mailjet.sysadmin)
        const redisClient = redis.createClient(d.redis['port'], d.redis['host'])
        redisClient.on('ready', () => {
            const Transports = new TransportScraper(tw, mail, redisClient)
            WebServer.startWebServer(d.port, Transports)
        })

        redisClient.on('error', exit)
    } catch (err) {
        exit(err)
    }
})

function exit(err: string) {
    console.error(err)
    process.exit(0)
}
