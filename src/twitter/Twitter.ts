import FormData from 'form-data';
import { TwitterAuth, TwitterRequestOptions, TwitterTweet, TwitterError } from './Interfaces';
import fetch from 'node-fetch'
import { OAuth } from 'oauth'

const TwitterAPIUrl: string = 'https://api.twitter.com/1.1/'
const TwitterRequestTokenUrl: string = 'https://api.twitter.com/oauth/request_token'
const TwitterAccessTokenUrl: string = 'https://api.twitter.com/oauth/access_token'
export default class Twitter {
    private auth: TwitterAuth
    private oauth: OAuth

    constructor(auth: TwitterAuth) {
        this.auth = auth
        this.oauth = new OAuth(
            TwitterRequestTokenUrl,
            TwitterAccessTokenUrl,
            auth.consumer_key,
            auth.secret_consumer_key,
            '1.0',
            null,
            'HMAC-SHA1'
        )
    }

    public async req(endpoint: string, options: TwitterRequestOptions): Promise<any> {
        try {
            endpoint = TwitterAPIUrl + endpoint + '.json'
            const reqType = options.method.toLowerCase()

            const params = options.formData
            const formd: FormData = new FormData()
            if (params) {
                if (reqType === 'get') {
                    endpoint += '?'
                    for (const k in params)
                        endpoint += `${k}=${params[k]}&`
                        
                    endpoint = endpoint.slice(0, -1)
                } else if (reqType === 'post') {
                    for (const k in params)
                            formd.append(k, params[k])
                } else {
                    return Promise.reject('That request method is not supported')
                }
            }

            const AuthHeader = this.oauth.authHeader(endpoint, this.auth.access_token, this.auth.secret_access_token, options.method)
            const body = await fetch(endpoint, { 
                method: options.method, 
                body: (params && reqType !== 'get') ? formd : undefined,
                headers: {
                    'Authorization': AuthHeader
                }
            })

            const tweet: TwitterTweet = await body.json()
            const errors: TwitterError[] = tweet.errors
            if (errors)
                return Promise.reject(errors)

            return tweet
        } catch (err) {
            return Promise.reject(err)
        }
    }
}