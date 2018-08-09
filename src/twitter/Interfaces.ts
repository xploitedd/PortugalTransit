export interface TwitterUser {
    [key: string]: string | string[] | number | { [key: string]: any[] } | boolean
    id: number
    id_str: string
    name: string
    screen_name: string
    location: string
    url: string
    description: string
    derived: { [key: string]: any[] }
    protected: boolean
    verified: boolean
    followers_count: number
    friends_count: number
    listed_count: number
    favourites_count: number
    statuses_count: number
    created_at: string
    utc_offset: string
    time_zone: string
    geo_enabled: boolean
    lang: string
    contributions_enabled: boolean
    profile_background_color: string
    profile_background_image_url: string
    profile_background_image_url_https: string
    profile_background_tile: boolean
    profile_banner_url: string
    profile_image_url: string
    profile_image_url_https: string
    profile_link_color: string
    profile_sidebar_border_color: string
    profile_sidebar_fill_color: string
    profile_text_color: string
    profile_use_background_image: boolean
    default_profile: boolean
    default_profile_image: boolean
    withheld_in_countries: string[]
    withheld_scope: string
}

export interface TwitterBoundingBox {
    [key: string]: string | number[][][]
    coordinates: number[][][],
    type: string
}

export interface TwitterPlace {
    [key: string]: string | TwitterBoundingBox | {}
    id: string
    url: string
    place_type: string
    name: string
    full_name: string
    country_code: string
    country: string
    bounding_box: TwitterBoundingBox
    attributes: {}
}

export interface TwitterCoordinates {
    [key: string]: string | number[]
    coordinates: number[]
    type: string
}

export interface TwitterHashtag {
    [key: string]: string | string[] | number[]
    indices: number[]
    text: string[]
}

export interface TwitterSize {
    [key: string]: string | number
    w: number
    h: number
    resize: string
}

export interface TwitterMediaSize {
    [key: string]: string | TwitterSize
    thumb: TwitterSize
    large: TwitterSize
    medium: TwitterSize
    small: TwitterSize
}

export interface TwitterMedia {
    [key: string]: string | number | number[] | TwitterMediaSize
    display_url: string
    expanded_url: string
    id: number
    id_str: string
    indices: number[]
    media_url: string
    media_url_https: string
    sizes: TwitterMediaSize
    source_status_id: number
    source_status_id_str: string
    type: string
    url: string
}

export interface TwitterUrl {
    [key: string]: string | number[]
    display_url: string
    expanded_url: string
    indices: number[]
    url: string
}

export interface TwitterUserMention {
    [key: string]: string | number | number[]
    id: number
    id_str: string
    indices: number[]
    name: string
    screen_name: string
}

export interface TwitterSymbol {
    [key: string]: string | number[]
    indices: number[]
    text: string
}

export interface TwitterOption {
    [key: string]: string | number
    position: number
    text: string
}

export interface TwitterPoll {
    [key: string]: TwitterOption[] | string
    options: TwitterOption[]
    end_datetime: string
    duration_minutes: string
}

export interface TwitterEntities {
    [key: string]: string | TwitterHashtag[] | TwitterMedia[] | TwitterUrl[] | TwitterUserMention[] | TwitterSymbol[] | TwitterPoll[]
    hashtags: TwitterHashtag[]
    media: TwitterMedia[]
    urls: TwitterUrl[]
    user_mentions: TwitterUserMention[]
    symbols: TwitterSymbol[]
    polls: TwitterPoll[]
}

export interface TwitterRule {
    [key: string]: string | number
    tag: string
    id: number
    id_str: string
}

export interface TwitterTweet {
    [key: string]: string | string[] | number | boolean | TwitterUser | TwitterCoordinates | TwitterPlace | TwitterTweet | TwitterEntities | TwitterRule[] | {}
    created_at: string
    id: number
    id_str: string
    text: string
    source: string
    truncated: boolean
    in_reply_to_status_id: number
    in_reply_to_status_id_str: string
    in_reply_to_user_id: number
    in_reply_to_user_id_str: string
    in_reply_to_screen_name: string
    user: TwitterUser
    coordinates: TwitterCoordinates
    place: TwitterPlace
    quoted_status_id: number
    quoted_status_id_str: number
    is_quote_status: boolean
    quoted_status: TwitterTweet
    retweeted_status: TwitterTweet
    quote_count: number
    reply_count: number
    retweet_count: number
    favorite_count: number
    entities: TwitterEntities
    extended_entities: TwitterEntities
    favorited: boolean
    retweeted: boolean
    possibly_sensitive: boolean
    filter_level: string
    lang: string
    matching_rules: TwitterRule[]
    current_user_retweet?: {}
    scopes?: {}
    withheld_copyright?: boolean
    withheld_in_countries?: string[]
    withheld_scope?: string
    errors?: TwitterError[]
}

export interface TwitterError {
    [key: string]: string | number
    code: number,
    message: string
}

export interface TwitterAuth {
    [key: string]: string
    consumer_key: string
    secret_consumer_key: string
    access_token: string
    secret_access_token: string
}

export interface TwitterOAuthParameters {
    [key: string]: string | number
    oauth_consumer_key: string
    oauth_nonce: string
    oauth_signature?: string
    oauth_signature_method: string
    oauth_timestamp: number
    oauth_token: string
    oauth_version: string
}

export interface TwitterRequestOptions {
    [key: string]: string | { [key: string]: any }
    method: string
    formData?: { [key: string]: any }
}