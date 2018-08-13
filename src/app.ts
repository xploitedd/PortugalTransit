import { TransportScraper } from './scraper/TransportScraper';
import WebServer from './webserver'
import Twitter from './twitter/Twitter'
import Emails, { MailjetPerson } from './emails';
import redis from 'redis'

let config
let consumer_key: string
let secret_consumer_key: string
let access_token: string
let secret_access_token: string
let smtp_username: string
let smtp_password: string
let from_email: MailjetPerson
let sysadmin: MailjetPerson[]
let port: number

try {
    config = require('../config')
    consumer_key = config.twitter.consumer_key
    secret_consumer_key = config.twitter.secret_consumer_key
    access_token = config.twitter.access_token
    secret_access_token = config.twitter.secret_access_token
    smtp_username = config.mailjet.smtp_username
    smtp_password = config.mailjet.smtp_password
    from_email = config.mailjet.from
    sysadmin = config.mailjet.sysadmin
    port = config.port 
} catch (err) {
    exit(err)
}

const tw = new Twitter({
    consumer_key,
    secret_consumer_key,
    access_token,
    secret_access_token
})

const mail = new Emails({
    smtp_username,
    smtp_password
}, from_email, sysadmin)

const Transports = new TransportScraper(tw, mail)
WebServer.startWebServer(port, Transports)

function exit(err: string) {
    console.error(err)
    process.exit(0)
}
