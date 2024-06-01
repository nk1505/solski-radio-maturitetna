import fs from 'fs'; // Delo z datotekami
const create_dirs = () => {

    const createDirectories = () => {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            console.error(cas(), "Napaka pri ustvarjanju mape za nalaganje glasbe! Ustvari mapo uploads.");
            return process.exit(1);
        }

        const playingDir = 'playing';
        if (!fs.existsSync(playingDir)) {
            console.error(cas(), "Napaka pri ustvarjanju mape za predvajalnik! Ustvari mapo playing.");
        }
    };
}

export { create_dirs };