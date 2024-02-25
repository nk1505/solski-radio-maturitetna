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
import { readdir } from 'fs/promises';
import mysql from 'mysql2';
import WebRadio from 'express-web-radio';
import axios from 'axios';
const app = express();

//? Nastavimo EJS za naš view engine
app.set('view engine', 'ejs');

//? Po potrebi ustvarimo mapo za nalaganje glasbe
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

//? Po potrebi ustvarimo mapo za nalaganje glasbe
const playingDir = 'playing';
if (!fs.existsSync(playingDir)) {
    fs.mkdirSync(playingDir);
}

//? Funkcija, ki pomaga pri nalaganju in preimenovanju datoteke
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: async function (req, file, cb) {
        const fileExtension = path.extname(file.originalname).toLowerCase();

        if (fileExtension !== '.mp3') {
            return cb(new Error('Samo .mp3 datoteke so dovoljene!'), null);
        }

        const artist = req.body.artist || 'UnknownArtist';
        const songName = req.body.songName || 'UnknownSong';
        const fileName = `${artist} - ${songName}${fileExtension}`;

        // Preveri, ali datoteka s tem imenom že obstaja
        try {
            await fs.promises.access(path.join(uploadDir, fileName));
            // Datoteka že obstaja
            return cb(new Error('Datoteka s tem imenom že obstaja! Izberite drugo ime.'), null);
        } catch (err) {
            // Datoteka ne obstaja, nadaljuj s trenutnim imenom
            cb(null, fileName);
        }
    }
});


const upload = multer({ storage: storage });

/*const db = mysql.createConnection({
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
});*/

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

app.use('/music', checkAuthenticated ,express.static('uploads'));

app.get('/upload', checkAuthenticated, (req, res) => {
    res.render('upload', { user: req.user });
});

app.post('/upload', checkAuthenticated, upload.single('musicFile'), (req, res) => {
    // Preveri, ali je uporabnik vpisal ime skladbe
    const songName = req.body.songName;
    if (!songName) {
        return res.status(400).json({ error: 'Vpišite ime skladbe.' });
    }

    // Preveri, ali je uporabnik vpisal izvajatelja
    const artist = req.body.artist;
    if (!artist) {
        return res.status(400).json({ error: 'Vpišite izvajatelja.' });
    }

    if (req.fileValidationError) {
        return res.status(400).json({ error: req.fileValidationError });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'Datoteka ni bila podana!' });
    }

    const file = req.file;

    res.json({ message: 'Datoteka je bila uspešno naložena.', file });
});

app.get('/library', checkAuthenticated, async (req, res) => {
    try {
        const libraryFiles = await readdir(uploadDir);
        const playingFiles = await readdir(playingDir);

        const librarySongs = libraryFiles
            .filter(file => file.endsWith('.mp3'))
            .map(file => ({
                name: file,
                isInPlaying: playingFiles.includes(file),
            }));

        // Vedno definirajte spremenljivke za sporočila
        res.render('library', { songs: librarySongs, user: req.user, errorMessage: null, successMessage: null });
    } catch (err) {
        console.error(err);
        res.status(500).render('library', { user: req.user, errorMessage: 'Napaka! Prišlo je do napake na strežniški strani!.' });
    }
});


// Dodajmo končno točko za izbris pesmi
// Dodajmo končno točko za izbris pesmi
app.delete('/delete-song/:songName', checkAuthenticated, async (req, res) => {
    try {
        const songName = decodeURIComponent(req.params.songName);
        console.log(songName);

        const filePath = path.join(uploadDir, songName);

        // Preveri, ali datoteka obstaja
        await fs.promises.access(filePath);

        // Pridobi ime trenutne pesmi
        const currentSongResponse = await axios.get('http://localhost:3000/current-song');
        const { song: currentSong } = currentSongResponse.data;

        // Preveri, ali se trenutno predvaja ta pesem
        if (currentSong === parseSongDetails(songName).song) {
            res.status(500).render('library', { user: req.user, errorMessage: 'Ne moreš izbrisati pesmi, ki se trenutno predvaja.' });
            return;
        }

        // Izbriši datoteko
        await fs.promises.unlink(filePath);

        // Posreduj sporočilo o uspehu in renderaj stran
        res.status(200).render('library', { user: req.user, successMessage: 'Pesem uspešno izbrisana.' });
    } catch (err) {
        console.error(err);
        if (err.code === 'ENOENT') {
            res.status(404).render('library', { user: req.user, errorMessage: 'Datoteka ne obstaja.' });
        } else {
            res.status(500).render('library', { user: req.user, errorMessage: 'Napaka pri brisanju pesmi.' });
        }
    }
});



/* app.post('/add-to-playlist/:songName', checkAuthenticated, (req, res) => {
    const songName = decodeURIComponent(req.params.songName);
  
    // Preveri, ali datoteka obstaja v mapi uploads
    const filePath = path.join(process.cwd(), 'uploads', songName);
  
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Datoteka ne obstaja.' });
    }
  
    // Dodaj ime skladbe v tabelo
    const query = 'INSERT INTO playlist (filename) VALUES (?)';
    db.query(query, [songName], (error, results) => {
      if (error) {
        console.error('Napaka pri dodajanju pesmi v tabelo:', error);
        res.status(500).json({ error: 'Napaka pri dodajanju pesmi v tabelo' });
      } else {
        console.log('Pesem uspešno dodana v tabelo.');
        res.status(200).json({ message: 'Pesem uspešno dodana v tabelo.' });
      }
    });
}); */

app.post('/add-to-playlist/:songName', checkAuthenticated, (req, res) => {
    const songName = decodeURIComponent(req.params.songName);
  
    // Preveri, ali datoteka obstaja v mapi uploads
    const sourceFilePath = path.join(process.cwd(), 'uploads', songName);
  
    if (!fs.existsSync(sourceFilePath)) {
        return res.status(404).json({ error: 'Datoteka ne obstaja.' });
    }

    const destinationDirectory = path.join(process.cwd(), 'playing');
    const destinationFilePath = path.join(destinationDirectory, songName);

    // Preveri, ali datoteka že obstaja v mapi playing
    if (fs.existsSync(destinationFilePath)) {
        return res.status(400).json({ error: 'Datoteka že obstaja v predvajalniku.' });
    }

    // Kopiraj datoteko v mapo playing
    fs.copyFileSync(sourceFilePath, destinationFilePath);

    res.json({ message: 'Datoteka je bila uspešno dodana v predvajalnik.' });
    const files = fs.readdirSync(playingDir);
    const mp3Files = files.filter(file => file.endsWith('.mp3'));

    if (mp3Files.length > 1) {
        radio.start(); 
    }
});

// API za odstranjevanje pesmi iz mape `/playing`
app.post('/remove-from-playlist/:songName', checkAuthenticated, async (req, res) => {
    const files = fs.readdirSync(playingDir);
    const mp3Files = files.filter(file => file.endsWith('.mp3'));

    try {
        const songName = decodeURIComponent(req.params.songName);
        console.log(songName);

        const filePath = path.join(playingDir, songName);

        // Preveri, ali datoteka obstaja
        await fs.promises.access(filePath);

        // Pridobi ime trenutne pesmi
        const currentSongResponse = await axios.get('http://localhost:3000/current-song'); // prilagodi port in naslov glede na tvoje okoliščine
        const { artist: currentArtist, song: currentSong } = currentSongResponse.data;

        // Preveri, ali se trenutno predvaja ta pesem
        if (currentSong === parseSongDetails(songName).song) {
            res.status(500).json({ error: 'Ne moreš izbrisati pesmi, ki se trenutno predvaja.' });
            return;
        }

        // Izbriši datoteko
        await fs.promises.unlink(filePath);

        res.json({ message: 'Pesem uspešno izbrisana.' });
    } catch (err) {
        console.error(err);
        if (err.code === 'ENOENT') {
            res.status(404).json({ error: 'Datoteka ne obstaja.' });
        } else {
            res.status(500).json({ error: 'Napaka pri brisanju pesmi.' });
        }
    }  
});



// Function to parse song details from the file name
function parseSongDetails(fileName) {
    // Assuming the file name format is "SongName - Composer.mp3"
    const [artist, composerWithExtension] = fileName.split(" - ");
    const song = composerWithExtension.replace(".mp3", "");
    return { artist, song };
}

const files = fs.readdirSync(playingDir);
const mp3Files = files.filter(file => file.endsWith('.mp3'));

const radio = new WebRadio({
    audioDirectory: "./playing", // Set the directory where audio files are stored
    loop: true, // Loop the audio files
    shuffle: true, // Shuffle the play order of the audio files
    logFn: (msg) => {
        // Log the message to the console
        console.log(`[Radio]: ${msg}`);

        // Extract the current song information from the log message
        const match = msg.match(/Now Playing: (.+) \| Bitrate: (\d+)kbps/);
        if (match && match.length === 3) {
            const songDetails = parseSongDetails(match[1]);
            radio.currentSong = {
                artist: songDetails.artist,
                song: songDetails.song,
                bitrate: parseInt(match[2]),
            };
        }
    },
});

radio.start();
app.get("/stream", radio.connect()); // Allow clients to connect to the radio stream
app.get('/radio', (req, res) => {
    res.render('radio');
});


// Dodaj novo pot za pridobivanje trenutne pesmi
app.get('/current-song', (req, res) => {
    const { artist, song } = radio.currentSong || {};
    if (artist !== undefined && song !== undefined) {
        res.json({ artist, song });
    } else {
        res.status(404).json({ error: "Nobena pesem se ne predvaja trenutno." });
    }
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

app.get('/settings', (req,res) => {
    res.redirect('https://auth.nejckrasevec.si/realms/master/account/');
});

app.get('*', (req, res) => {
    res.status(404).send('Ne obstaja');
});


app.listen(process.env.port | 3000, function () {
    console.log(`Aplikacija deluje na http://${process.env.DOMAIN || "localhost"}:${process.env.PORT || 3000}`);
});