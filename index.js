require('dotenv').config();
const express = require('express');
const querystring = require('querystring');
const axios = require('axios');
const session = require('express-session');

const app = express();

app.set('view engine', 'pug');

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

const REDIRECT_URI = `http://localhost:3000/oauth-callback`;

const authUrl = `https://app-eu1.hubspot.com/oauth/authorize?client_id=0a49d018-6520-4863-946f-9757f6ec1335&redirect_uri=http://localhost:3000/oauth-callback&scope=crm.objects.contacts.write%20oauth%20crm.objects.contacts.read`;

const tokenStore = {};

app.use(session({
    secret: Math.random().toString(36).substring(2),
    resave: false,
    saveUninitialized: true
}));

const isAuthorized = (userId) => {
    return tokenStore[userId] ? true : false;
};

// * 1. Send user to authorization page. This kicks off initial requeset to OAuth server.
app.get('/', async (req, res) => {
    if (isAuthorized(req.sessionID)) {
        const accessToken = tokenStore[req.sessionID];
        const headers = {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };
        const contacts = `https://api.hubapi.com/crm/v3/objects/contacts`;
        try {
            const resp = await axios.get(contacts, {headers});
            const data = resp.data;
            res.render('home', {
                token: accessToken,
                contacts: data.results
            });
        } catch (error) {
            console.error(error);
        }
    }else{
        res.render("home", { authUrl });
    }
});
// * 2. Get temporary authorization code from OAuth server.
// * 3. Combine temporary auth code wtih app credentials and send back to OAuth server.
app.get('/oauth-callback', async (req, res) => {
    // res.send(req.query.code);
    const authCodeProof = {
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code: req.query.code
    };
    try {
        const responseBody = await axios.post('https://api.hubspot.com/oauth/v1/token', querystring.stingify(authCodeProof));
        // res.json(responseBody.data);
        tokenStore[req.sessionID] = responseBody.data.access_token;
        res.redirect('/');
    } catch (error) {
        console.error(error);
    }
});
// * 4. Get access and refresh tokens.

app.listen(3000, () => console.log('App running here: http://localhost:3000'));

