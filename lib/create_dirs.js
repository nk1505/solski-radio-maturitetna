import fs from 'fs'; // Delo z datotekami
const create_dirs = () => {

    const createDirectories = () => {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }

        const playingDir = 'playing';
        if (!fs.existsSync(playingDir)) {
            fs.mkdirSync(playingDir);
        }
    };
}

export { create_dirs };