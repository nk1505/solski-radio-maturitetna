//! komentar
//? Komentar
// TODO komentar


// Importamo module
import 'dotenv/config'
import express from 'express';
import { Issuer, Strategy } from 'openid-client';
import passport from 'passport';
import expressSession from 'express-session';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { readdir } from 'fs/promises';
// import mysql from 'mysql2';
import WebRadio from 'express-web-radio';
import axios from 'axios';
//import { timeStamp } from 'console';
const app = express();

// Nastavimo EJS za naš view engine
app.set('view engine', 'ejs');

// Po potrebi ustvarimo mapo za nalaganje glasbe
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Po potrebi ustvarimo mapo za nalaganje glasbe
const playingDir = 'playing';
if (!fs.existsSync(playingDir)) {
    fs.mkdirSync(playingDir);
}

// Funkcija, ki pomaga pri nalaganju in preimenovanju datoteke
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: async function (req, file, cb) {
        const fileExtension = path.extname(file.originalname).toLowerCase();

        if (fileExtension !== '.mp3') {
            return cb(('Samo .mp3 datoteke so dovoljene!'), null);
        }

        const artist = req.body.artist || 'Neznani_ustvarjalec';
        const songName = req.body.songName || 'Neznana_pesem';
        const fileName = `${artist} - ${songName}${fileExtension}`;

        // Preveri, ali datoteka s tem imenom že obstaja
        try {
            await fs.promises.access(path.join(uploadDir, fileName));
            // Datoteka že obstaja
            return cb(('Datoteka s tem imenom že obstaja! Izberite drugo ime.'), null);
        } catch (err) {
            // Datoteka ne obstaja, nadaljuj s trenutnim imenom
            cb(null, fileName);
        }
    }
});

// Dodamo še dodatno preverjanje imena datoteke z regexom
// Dodamo še dodatno preverjanje imen avtorja in pesmi z regexom
// Dodamo še dodatno preverjanje imen avtorja in pesmi z regexom
const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const validFileName = /^[^\-]*$/; // Regex za preverjanje, da v imenu ni znaka "-"

        // Preverimo, ali ime avtorja in pesmi vsebujeta znak "-"
        if (!validFileName.test(req.body.artist)) {
            return cb('Ime izvajalca ne sme vsebovati znaka "-". Prosimo, izberite drugo ime.', false);
        }
        if (!validFileName.test(req.body.songName)) {
            return cb('Ime skladbe ne sme vsebovati znaka "-". Prosimo, izberite drugo ime.', false);
        }

        cb(null, true);
    }
});




const keycloakIssuer = await Issuer.discover(process.env.keycloakIssuer)
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



// Preusmeri na openID prijavno stran
app.get('/login', (req, res, next) => {
    passport.authenticate('oidc')(req, res, next);
});

// Vračilo klica z openID prijavne spletne strani
app.get('/auth/callback', (req, res, next) => {
    passport.authenticate('oidc', {
      successRedirect: '/',
      failureRedirect: '/'
    })(req, res, next);
});

// Funkcija bo preverjala ali je uporabnik prijavljen (middleware)
var checkAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) { 
        return next() 
    }
    res.redirect("/login")
}
// Pot za statične datoteke (ikone, slike, CSS, JS, ...)
app.use('/',express.static('public'));

// Pot za predogled glasbe (knjižnica)
app.use('/music', checkAuthenticated ,express.static('uploads'));


// Pot za nalaganje glasbe (GET)
app.get('/upload', checkAuthenticated, (req, res) => {
    res.render('upload', { user: req.user });
});

// Pot za nalaganje glasbe (POST)
app.post('/upload', checkAuthenticated, upload.single('musicFile'), (req, res, err) => {
    // Preverimo, če je dejansko datoteka podana
    if (!req.file) {
        return res.status(400).json({ error: 'Datoteka ni bila podana!' });
    }
    // Preveri, ali je uporabnik vpisal ime skladbe
    const songName = req.body.songName;
    if (!songName) {
        return res.status(400).json({ error: 'Vpišite ime skladbe!' });
    }
    // Preveri, ali je uporabnik vpisal izvajatelja
    const artist = req.body.artist;
    if (!artist) {
        return res.status(400).json({ error: 'Vpišite izvajatelja!' });
    }
    // Preverimo datoteko
    if (req.fileValidationError) {
        return res.status(400).json({ error: 'Napaka pri preverjanju datoteke!' });
    }
    const file = req.file;
    console.log(cas(), "Pesem je bila uspešno naložna: ", songName, "(", req.user.name, ")");
    res.render('upload', { user: req.user, message: 'Pesem je bila uspešno naložena' });
    //res.json({ message: 'Pesem je bila uspešno naložena.', file });
});


// Pot za knjižnico (GET)
// Pot za knjižnico (GET)
/*
app.get('/library', checkAuthenticated, async (req, res) => {
    try {
        // Pridobimo imena glasb, ki so trenutno naložene in ki so trenutno na seznamu predvajanja
        const libraryFiles = await readdir(uploadDir);
        const playingFiles = await readdir(playingDir);

        // Iščemo vse datoteke, ki se predvajajo
        const librarySongs = libraryFiles
            .filter(file => file.endsWith('.mp3'))
            .map(file => ({
                name: file,
                isInPlaying: playingFiles.includes(file),
            }));

        // Vedno definirajte spremenljivke za sporočila
        console.log("Seznam pesmi:", librarySongs); // Dodajte ta izpis
        res.render('library', { songs: librarySongs, user: req.user });
    } catch (err) {
        console.error(cas(), "Napaka pri nalaganju knjižnice: ", err, "(", req.user.name, ")");
        res.status(500).render('library', { user: req.user, error: 'Napaka! Prišlo je do napake na strežniški strani!.' });
    }
}); */


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



// Dodajmo končno točko za izbris pesmi (DELETE)
app.delete('/delete-song/:songName', checkAuthenticated, async (req, res) => {
    try {
        // Dekodirami ime pesmi, ki bi jo radi izbrisali
        const songName = decodeURIComponent(req.params.songName);

        // Sestavimo pot do datoteke, ki bi jo radi izbrisali
        const filePath = path.join(uploadDir, songName);

        // Preveri, ali datoteka obstaja
        await fs.promises.access(filePath);

        // Pridobi ime trenutne pesmi
        const currentSongResponse = await axios.get('http://localhost:3000/current-song');
        const { song: currentSong } = currentSongResponse.data;

        // Preveri, ali se trenutno predvaja ta pesem
        if (currentSong === parseSongDetails(songName).song) {
            res.status(500).render('library', { user: req.user, error: 'Ne moreš izbrisati pesmi, ki se trenutno predvaja.' });
            return;
        }

        // Izbriši datoteko
        await fs.promises.unlink(filePath);

        // Pridobim imena pesmi za izpis
        const libraryFiles = await readdir(uploadDir);
        const playingFiles = await readdir(playingDir);

        const librarySongs = libraryFiles
            .filter(file => file.endsWith('.mp3'))
            .map(file => ({
                name: file,
                isInPlaying: playingFiles.includes(file),
            }));


        // Posreduj sporočilo o uspehu in renderaj stran
        console.error(cas(), "Uspešno izbrisana pesem: ",songName, "(", req.user.name, ")");
        res.status(200).render('library', { songs: librarySongs, user: req.user, successMessage: 'Pesem uspešno izbrisana.' });
    } catch (err) {
        // Preverimo, ali datoteka obstaja
        if (err.code === 'ENOENT') {
            // Izpis v primeru, da pesem ne obstaja
            res.status(404).render('library', { user: req.user, errorMessage: 'Datoteka ne obstaja.' });
        } else {
            // Izpis v primeru, da pesem obstaja
            console.error(cas(), "Napaka pri brisanju pesmi: ",songName, " | ", err, "(", req.user.name, ")");
            res.status(500).render('library', { user: req.user, errorMessage: 'Napaka pri brisanju pesmi.' });
        }
    }
});

// Dodajanje glasb na seznam predvajanja
app.post('/add-to-playlist/:songName', checkAuthenticated, (req, res) => {
    // Dekodiramo ime pesmi, ki bi jo radi dodali na seznam predvajanja
    const songName = decodeURIComponent(req.params.songName);
  
    // Preveri, ali datoteka obstaja v mapi uploads
    const sourceFilePath = path.join(process.cwd(), 'uploads', songName);
  
    // Preverimo, ali pesem ki jo želimo dodati na seznam predvajanja obstaja
    if (!fs.existsSync(sourceFilePath)) {
        return res.status(404).json({ error: 'Pesem ne obstaja.' });
    }

    // Določimo ciljni direktorij za kopiranje datoteke
    const destinationDirectory = path.join(process.cwd(), 'playing');
    const destinationFilePath = path.join(destinationDirectory, songName);

    // Preveri, ali datoteka že obstaja v mapi playing
    if (fs.existsSync(destinationFilePath)) {
        return res.status(400).json({ error: 'Pesem že obstaja v predvajalniku.' });
    }

    // Kopiraj datoteko v mapo playing
    fs.copyFileSync(sourceFilePath, destinationFilePath);

    console.error(cas(), "Pesem je bila dodana na seznam predvajanja: ",songName, "(", req.user.name, ")");
    res.json({ message: 'Pesem je bila uspešno dodana v predvajalnik.' });
    //const files = fs.readdirSync(playingDir);
    //const mp3Files = files.filter(file => file.endsWith('.mp3'));
});

// Pot za odstranjevanje pesmi z seznama predvajanja
app.post('/remove-from-playlist/:songName', checkAuthenticated, async (req, res) => {
    //const files = fs.readdirSync(playingDir);
    //const mp3Files = files.filter(file => file.endsWith('.mp3'));
    try {
        // Dekodiramo ime pesmi, ki bi jo radi dodali na seznam predvajanja
        const songName = decodeURIComponent(req.params.songName);

        //Sestavimo pot do pesmi
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
        console.error(cas(), "Pesem je bila uspešno izbrisana s seznama predvajanja: ", songName, "(", req.user.name, ")");
        res.json({ message: 'Pesem uspešno izbrisana.' });
    } catch (err) {
        console.error(err);
        if (err.code === 'ENOENT') {
            res.status(404).json({ error: 'Datoteka ne obstaja.' });
        } else {
            console.error(cas(), "Napaka pri brisanju pesmi z seznama predvajanja: ", songName, " | " ,err, "(", req.user.name, ")");
            res.status(500).json({ error: 'Napaka pri brisanju pesmi.' });
        }
    }  
});


// Funkcija namenjena parsanju imena ustvarjalca in pesmi z imena pesmi
function parseSongDetails(fileName) {
    // Format skladb bi moral biti "Izvajalec - Skladba.mp3"
    const [artist, composerWithExtension] = fileName.split(" - ");
    const song = composerWithExtension.replace(".mp3", "");
    return { artist, song };
}

//const files = fs.readdirSync(playingDir);
//const mp3Files = files.filter(file => file.endsWith('.mp3'));

// Definiranje funkcije z nastavitvami za pretakanje glasbe
const radio = new WebRadio({
    audioDirectory: "./playing", // Mapa katera služi kot seznam predvajanja
    loop: true, // Neskončno ponavljanje glasbe
    shuffle: true, // Naključen izbor glasbe
    logFn: (msg) => {
        // Izpis glasbe, ki se trenutno predvaja ter parsanje imena izvajalca ter pesmi
        console.log(cas(),`[Radio]: ${msg}`);

        // Parsanje imena
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

// Zaženemo radio
radio.start();

// Link, kjer bomo pretakali glabno
app.get("/stream", radio.connect());

// Spletna stran, kjer bo predvajalnik za radio
app.get('/radio', (req, res) => {
    res.render('radio');
});


// Dodaj novo pot za pridobivanje trenutne pesmi
app.get('/current-song', (req, res) => {
    // Pridobimpo podatke z našega parserja
    const { artist, song } = radio.currentSong || {};
    
    // Preverimo, ali je uspešno prepoznal izvajalca in pesem
    if (artist !== undefined && song !== undefined) {
        res.json({ artist, song });
    } else {
        res.status(404).json({ error: "Nobena pesem se ne predvaja trenutno." });
    }
});
  
// Testna pot, za gledanje katere podatke o uporabniku imam
app.get('/data', (req, res) => {
    if(req.user){
        res.send(req.user);
    }else{
        res.send("Ni podatkov");
    }
});

// Domača spletna stran
app.get('/',function(req,res){
    res.render('index',{ user: req.user });
});

// Funkcija za odjavo
app.get('/logout', (req, res) => {
    res.redirect(client.endSessionUrl());
});

// Povratna funkcija za odjavo
app.get('/logout/callback', (req, res) => {
    // Poskrbi, da še aplikacija odjavi uporabnika
    req.logout((err) => {
        if (err) {
            console.error(cas, "Napaka pri odjavi uporabnika: ",err);
            return next(err);
        }
        // Preusmerimo uporabnika na domačo stran
        res.redirect('/');
    });
});

// Pot, kjer uporabnik pride do nastavitev svojega računa
app.get('/settings', (req,res) => {
    // Pridobimo z .env
    const settings = process.env.keycloakIssuer + '/account/';
    res.redirect(settings);
});

// Pot za strani, ki ne obstajajo (HTTP 404)
app.get('*', (req, res) => {
    res.status(404).send('Ne obstaja');
});

// Povemo aplikacije kje naj deluje
app.listen(process.env.port | 3000, function () {
    console.log(cas(), `Aplikacija deluje na http://${process.env.DOMAIN || "localhost"}:${process.env.PORT || 3000}`);
});

// Funkcija za generiranje datuma in časa (izpis v terminal)
function cas() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8);
    return `${date} ${time}`;
}