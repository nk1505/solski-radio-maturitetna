//! komentar
//? Komentar
// TODO komentar


//? Importamo module
import 'dotenv/config'
import express from 'express';
import { Issuer, Strategy } from 'openid-client';
import passport from 'passport';
import expressSession from 'express-session';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mysql from 'mysql2';
const app = express();

//? Nastavimo EJS za naš view engine
app.set('view engine', 'ejs');

//? Po potrebi ustvarimo mapo za nalaganje glasbe
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

//? Funkcija, ki pomaga pri nalaganju in preimenovanju datoteke
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const fileExtension = path.extname(file.originalname).toLowerCase();

        if (fileExtension !== '.mp3') {
            return cb(new Error('Samo .mp3 datoteke so dovoljene!'), null);
        }

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
});

const upload = multer({ storage: storage });

const db = mysql.createConnection({
    host: process.env.db_host,
    user: process.env.db_user,
    password: process.env.db_password,
    database: process.env.db_database,
});

db.connect((err) => {
    if (err) {
        console.error('Napaka pri povezovanju na MySQL:', err);
        return;
    }
    console.log('Povezan na MySQL');
});

const keycloakIssuer = await Issuer.discover(process.env.keycloakIssuer)
// don't think I should be console.logging this but its only a demo app
// nothing bad ever happens from following the docs :)
//console.log('Najdeni keycloak podatki %s %O', keycloakIssuer.issuer, keycloakIssuer.metadata);

const client = new keycloakIssuer.Client({
    client_id: process.env.client_id,
    client_secret: process.env.client_secret,
    redirect_uris: [process.env.redirect_uris],
    post_logout_redirect_uris: [process.env.post_logout_redirect_uris],
    response_types: ['code'],
  });

var memoryStore = new expressSession.MemoryStore();
app.use(
    expressSession({
    secret: process.env.cookie_secret,
    resave: false,
    saveUninitialized: true,
    store: memoryStore
    })
);

app.use(passport.initialize());
app.use(passport.authenticate('session'));

passport.use('oidc', new Strategy({client}, (tokenSet, userinfo, done)=>{
        return done(null, tokenSet.claims());
    })
)

passport.serializeUser(function(user, done) {
    done(null, user);
  });
passport.deserializeUser(function(user, done) {
    done(null, user);
});



// default protected route /test
app.get('/login', (req, res, next) => {
    passport.authenticate('oidc')(req, res, next);
});

// callback always routes to test 
app.get('/auth/callback', (req, res, next) => {
    passport.authenticate('oidc', {
      successRedirect: '/',
      failureRedirect: '/'
    })(req, res, next);
});

// function to check weather user is authenticated, req.isAuthenticated is populated by password.js
// use this function to protect all routes
var checkAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) { 
        return next() 
    }
    res.redirect("/login")
}

app.use('/music', express.static('uploads'));

app.get('/upload', checkAuthenticated, (req, res) => {
    res.render('upload', { user: req.user });
});

app.post('/upload', checkAuthenticated, upload.single('musicFile'), (req, res) => {
    if (req.fileValidationError) {
        return res.status(400).json({ error: req.fileValidationError });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'Datoteka ni bila podana!' });
    }

    const file = req.file;

    res.json({ message: 'Datoteka je bila uspešno naložena.', file });
});

app.get('/data', (req, res) => {
    if(req.user){
        res.send(req.user);
    }else{
        res.send("Ni podatkov");
    }
});

//unprotected route
app.get('/',function(req,res){
    res.render('index',{ user: req.user });
});

// start logout request
app.get('/logout', (req, res) => {
    res.redirect(client.endSessionUrl());
});

// logout callback
app.get('/logout/callback', (req, res) => {
    // clears the persisted user from the local storage
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        // redirects the user to a public route
        res.redirect('/');
    });
});

app.get('*', (req, res) => {
    res.status(404).send('Ne obstaja');
});


app.listen(process.env.port | 3000, function () {
    console.log(`Aplikacija deluje na http://${process.env.DOMAIN || "localhost"}:${process.env.PORT || 3000}`);
});