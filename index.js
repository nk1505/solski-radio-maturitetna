//! komentar
//? Komentar
// TODO komentar


import { check_env } from './lib/check_env.js';
import { create_dirs } from './lib/create_dirs.js';

check_env(); // Preverjamo, ali imamo nastavljene vse env spremenljivke

// Importamo module
import 'dotenv/config' // ENV
import express from 'express'; // Spletni strežnik
import { Issuer, Strategy } from 'openid-client'; // OpenID knjižnica
import passport from 'passport'; // AUTH
import expressSession from 'express-session'; // Session
import multer from 'multer'; // Middelware za datoteke
import path from 'path'; // Procesiranje poti za datoteke
import fs from 'fs'; // Delo z datotekami
import { readdir } from 'fs/promises';
import WebRadio from 'express-web-radio'; // Streaming zvoka (radio del)
import axios from 'axios'; // HTTP requests

const uploadDir = 'uploads';
const playingDir = 'playing';

// Kreiramo aplikacijo
const app = express();

// Nastavimo EJS za naš view engine
app.set('view engine', 'ejs');

create_dirs(); // Kličemo datoteko z kodo, ki po potrebi ustvari nove mape

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

        const artist = req.body.artist;
        const songName = req.body.songName;
        if (artist == undefined || artist == "" || songName == undefined || songName == ""){
            return cb(('Manjka ime avtorja in/ali ime pesmi.'), null);
        }
        const fileName = `${artist} - ${songName}${fileExtension}`;

        // Preveri, ali datoteka s tem imenom že obstaja
        try {
            // Datoteka že obstaja
            await fs.promises.access(path.join(uploadDir, fileName));
            return cb(('Datoteka s tem imenom že obstaja! Izberite drugo ime.'), null);
        } catch (err) {
            // Datoteka ne obstaja, nadaljuj s trenutnim imenom
            cb(null, fileName);
        }
    }
});


// Dodamo še dodatno preverjanje imen avtorja in pesmi z regexom
const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const validFileName = /^[^\/\'\-]*$/; // Regex za preverjanje, da v imenu ni znaka "-"

        // Preverimo, ali ime avtorja in pesmi vsebujeta znak "-"
        if (!validFileName.test(req.body.artist)) {
            return cb('Ime izvajalca ne sme vsebovati znaka "-" ali znaka "/" ali znaka "\'". Prosimo, izberite drugo ime.', false);
        }
        if (!validFileName.test(req.body.songName)) {
            return cb('Ime skladbe ne sme vsebovati znaka "-" ali znaka "/" ali znaka "\'". Prosimo, izberite drugo ime.', false);
        }

        cb(null, true);
    }
});



// Naredimo povezavo na naš OpenID strežnik, ki jo bodo uporabljali uporabniki za prijavo
const keycloakIssuer = await Issuer.discover(process.env.keycloakIssuer)
const client = new keycloakIssuer.Client({
    client_id: process.env.client_id,
    client_secret: process.env.client_secret,
    redirect_uris: [process.env.redirect_uris],
    post_logout_redirect_uris: [process.env.post_logout_redirect_uris],
    response_types: ['code'],
});

// Session
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

// Strategija za avtentikacijo
passport.use('oidc', new Strategy({client}, (tokenSet, done)=>{
    return done(null, tokenSet.claims());
}))
// Serializacija uporabnika (prijava)
passport.serializeUser(function(user, done) {
    done(null, user);
});
// Deserializacija uporabnika (odjava)
passport.deserializeUser(function(user, done) {
    done(null, user);
});



// Preusmeri na openID prijavno stran
app.get('/login', passport.authenticate('oidc'));

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
        return next();
    }
    res.redirect("/login");
}

// Domača spletna stran
app.get('/',function(req, res){
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
app.get('/settings', (req, res) => {
    // Pridobimo z .env
    const settings = process.env.keycloakIssuer + '/account/';
    res.redirect(settings);
});

// Pot za statične datoteke (ikone, slike, CSS, JS, ...)
app.use('/',express.static('public'));

// Pot za predogled glasbe (knjižnica)
app.use('/music', checkAuthenticated ,express.static('uploads'));


// Pot za nalaganje glasbe (GET)
app.get('/upload', checkAuthenticated, (req, res) => {
    res.render('upload', { user: req.user, message:'', errorMessage: '' });
});

// Pot za nalaganje glasbe (POST)
app.post('/upload', checkAuthenticated, upload.single('musicFile'), async(req, res) => {
    try{
        // Preverimo, če je dejansko datoteka podana
        if (!req.file) {
            console.error(cas(), "Uporabnik ni podal datoteke pri nalaganju! ","(", req.user.name, ")");
            return res.status(400).json({ error: 'Datoteka ni bila podana!' });
        }
        // Preveri, ali je uporabnik vpisal ime skladbe
        const songName = req.body.songName;
        if (!songName) {
            console.error(cas(), "Uporabnik ni vpisal ime skladbe pri nalaganju nove pesmi! ","(", req.user.name, ")");
            return res.status(400).json({ error: 'Vpišite ime skladbe!' });
        }
        // Preveri, ali je uporabnik vpisal izvajatelja
        const artist = req.body.artist;
        if (!artist) {
            console.error(cas(), "Uporabnik ni vpisal izvajatelja pri nalaganju nove pesmi! ","(", req.user.name, ")");
            return res.status(400).json({ error: 'Vpišite izvajatelja!' });
        }
        // Preverimo datoteko
        if (req.fileValidationError) {
            console.error(cas(), "Napaka pri validaciji novo naložene glasbe! ","(", req.user.name, ")");
            return res.status(400).json({ error: 'Napaka pri preverjanju datoteke!' });
        }
    
        console.log(cas(), "Pesem je bila uspešno naložna: ", songName, "(", req.user.name, ")");
        res.render('upload', { user: req.user, message: 'Pesem je bila uspešno naložena', errorMessage: '' });
    } catch (err){
        console.error(cas(), "Napaka strežnika /upload (post): ",songName, "(", req.user.name, ")");
        res.status(500).render('upload', { user: req.user, errorMessage: 'Napaka! Prišlo je do napake na strežniški strani!.', message: '' });
    }
});

// Pot za pregledovanje in upravljanje glasbe (GET)
app.get('/library', checkAuthenticated, async (req, res) => {
    try {
        const [libraryFiles, playingFiles] = await Promise.all([readdir(uploadDir), readdir(playingDir)]); // Asinhrono branje, da lahko hkrati beremo z obeh map

        const librarySongs = libraryFiles
            .filter(file => file.endsWith('.mp3'))
            .map(file => ({
                name: file,
                isInPlaying: playingFiles.includes(file),
            }));


        res.render('library', { songs: librarySongs, user: req.user, errorMessage: null});
    } catch (err) {
        console.error(cas(), "Napaka strežnika /library (get): ",songName, "(", req.user.name, ")");
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
        const request_url = `${process.env.protocol}://${process.env.domain}:${process.env.port}/current-song`;
        const currentSongResponse = await axios.get(request_url);
        const { song: currentSong } = currentSongResponse.data;

        // Preveri, ali se trenutno predvaja ta pesem
        if (currentSong === parseSongDetails(songName).song || currentSong === 'Nobena pesem se ne predvaja trenutno.') {
            res.status(500).json({ error: 'Ne moreš izbrisati pesmi, ki se trenutno predvaja.' });
        } else{
            // Izbriši datoteko
            await fs.promises.unlink(filePath);
        }

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
            console.error(cas(), "Datoteka ne obstaja: ",songName, "(", req.user.name, ")");
            res.status(400).render('library', { user: req.user, errorMessage: 'Datoteka ne obstaja.' });
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
        return res.status(400).json({ error: 'Pesem ne obstaja.' });
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
});

// Pot za odstranjevanje pesmi z seznama predvajanja
app.post('/remove-from-playlist/:songName', checkAuthenticated, async (req, res) => {
    let songName;
    try {
        // Dekodiramo ime pesmi, ki bi jo radi dodali na seznam predvajanja
        songName = decodeURIComponent(req.params.songName);

        // Sestavimo pot do pesmi
        const filePath = path.join(playingDir, songName);

        // Preveri, ali datoteka obstaja
        await fs.promises.access(filePath);

        // Pridobi ime trenutne pesmi
        const request_url = `${process.env.protocol}://${process.env.domain}:${process.env.port}/current-song`;
        const currentSongResponse = await axios.get(request_url);
        const { song: currentSong } = currentSongResponse.data;

        // Preveri, ali se trenutno predvaja ta pesem
        if (currentSong === parseSongDetails(songName).song || currentSong === 'Nobena pesem se ne predvaja trenutno.') {
            return res.status(500).json({ error: 'Ne moreš izbrisati pesmi, ki se trenutno predvaja.' });
        } else {
            // Izbriši datoteko
            await fs.promises.unlink(filePath);
        }

        console.error(cas(), "Pesem je bila uspešno izbrisana s seznama predvajanja: ", songName, "(", req.user.name, ")");
        res.json({ message: 'Pesem uspešno izbrisana.' });
    } catch (err) {
        console.error(err);
        if (err.code === 'ENOENT') {
            res.status(400).json({ error: 'Datoteka ne obstaja.' });
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

// Definiranje funkcije z nastavitvami za pretakanje glasbe
const radio = new WebRadio({
    audioDirectory: "./playing", // Mapa katera služi kot seznam predvajanja
    loop: true, // Neskončno ponavljanje glasbe
    shuffle: true, // Naključen izbor glasbe
    logFn: (msg) => {
        // Izpis glasbe, ki se trenutno predvaja ter parsanje imena izvajalca ter pesmi
        console.log(cas(),`[Radio]: ${msg}`);

        // Parsanje podatkov o pesmi, ki se trenutno predvaja (hvala knjižnjici, ker ne podpira tega :( ))
        const match = msg.match(/Now Playing: (.+) \| Bitrate: ([\d\.]+)kbps/);
        //console.log (match);
        //console.log(msg);
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
app.get('/radio', (req,res) => {
    res.render('radio');
});


// Dodaj novo pot za pridobivanje trenutne pesmi
app.get('/current-song', (req,res) => {
    // Pridobimpo podatke z našega parserja
    const { artist, song } = radio.currentSong || {};
    
    //console.log(cas(), "Trenutno predvaja pesem: ", artist, " - ", song);
    // Preverimo, ali je uspešno prepoznal izvajalca in pesem
    if (artist !== undefined && song !== undefined) {
        res.json({ artist, song });
    } else {
        res.status(500).json({ error: "Nobena pesem se ne predvaja trenutno." });
    }
});

// Pot za strani, ki ne obstajajo (HTTP 404)
app.get('*', (req, res) => {
    console.error(cas(), '[Dostop] Nekdo je neuspšno poizkušal dostopati do: ', req.originalUrl);
    res.status(404).send('Ne obstaja');
});

// Povemo aplikacije kje naj deluje
app.listen(process.env.port, function () {
    console.log(cas(), `Aplikacija deluje na ${process.env.protocol}://${process.env.domain}:${process.env.port}`);
});

// Funkcija za generiranje datuma in časa (izpis v terminal)
function cas() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8);
    return `${date} ${time}`;
}