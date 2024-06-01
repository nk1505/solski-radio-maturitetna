// Definiraj funkcijo handleClick pred uporabo
function handleClick() {
    fileInput.click();
    updateDropAreaText(); // Dodajamo klic funkcije za posodobitev besedila
}

$(document).ready(function () {
$('.ui.dropdown').dropdown({ on: 'hover' });

// Definiraj funkcijo get_metadata za branje metapodatkov
function get_metadata(file) {
    // Uporabi knjižnico jsmediatags za branje metapodatkov
    jsmediatags.read(file, {
        onSuccess: function(tag) {
            const artist = tag.tags.artist || "";
            const title = tag.tags.title || "";
            document.getElementById('artist').value = artist.trim();
            document.getElementById('songName').value = title.trim();
        },
        onError: function(error) {
            console.log(error);
        }
    });
}

// Dodaj dogodek za spremembo vnosnega polja datoteke
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', function(event) {
    const files = event.target.files;
    if (files.length > 0) {
        const artistInput = document.getElementById('artist');
        const songNameInput = document.getElementById('songName');
        artistInput.value = "";
        songNameInput.value = "";
        // Preberi metapodatke ob izbiri datoteke
        get_metadata(files[0]);
        updateDropAreaText(); // Dodajamo klic funkcije za posodobitev besedila
    }
});

// Prepreči privzeto obnašanje povleci in spusti
const dropArea = document.getElementById('dropArea');
dropArea.addEventListener('dragover', function(event) {
    event.preventDefault();
});

dropArea.addEventListener('drop', function(event) {
    event.preventDefault();
});

// Funkcija za posodabljanje besedila v padajočem meniju
function updateDropAreaText() {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    if (fileInput.files.length > 0) {
    dropArea.innerHTML = `Izbrana datoteka: ${fileInput.files[0].name}`;
    } else {
    dropArea.innerHTML = 'Klikni za nalaganje datoteke.';
    }
}

// Dodaj funkcionalnost gumba "Ponastavi"
const resetButton = document.querySelector('button[type="reset"]');
    resetButton.addEventListener('click', function() {
        const dropArea = document.getElementById('dropArea');
        dropArea.innerHTML = 'Klikni za nalaganje datoteke.';
        fileInput.value = ''; // Počisti izbrano datoteko
        updateDropAreaText(); // Posodobi besedilo v padajočem meniju
    });
});