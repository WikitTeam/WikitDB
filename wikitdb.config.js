// wikitdb.config.js
const { FLIGHT_PARAMETERS } = require("next/dist/client/components/app-router-headers");

module.exports = {
    SITE_NAME: 'WikitDB',
    SITE_URL: '',
    SITE_SINCE: '2026',
    SITE_AUTHOR: 'WikitDB Team',

    SUPPORT_WIKI: [
        {
            NAME: "Wikidot",
            URL: "https://www.wikidot.com/",
            ImgURL: "/img/wikidot.png",
            PARAM: "wikidot"
        },
        {
            NAME: "深林文学部",
            URL: "https://deep-forest-club.wikidot.com/",
            ImgURL: "https://deep-forest-club.wdfiles.com/local--files/component%3Atheme/logo.png",
            PARAM: "dfc"
        },
        {
            NAME: "地下黑市",
            URL: "https://ubmh.wikidot.com/",
            ImgURL: "https://ubmh.wdfiles.com/local--files/admin%3Atheme/ubmh.webp",
            PARAM: "ubmh"
        }
    ]
};
