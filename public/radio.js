// JavaScript za prikaz trenutno predvajane pesmi
const currentSongElement = document.getElementById('current-song');

// Funkcija za pridobivanje trenutno predvajane pesmi
function getCurrentSong() {
  fetch('/current-song')
    .then(response => response.json())
    .then(data => {
      // Prikaz trenutno predvajane pesmi
      if (data.artist !== undefined && data.song !== undefined) {
        currentSongElement.innerText = `Trenutno predvajano: ${data.artist} - ${data.song}`;
      } else {
        currentSongElement.innerText = 'Trenutno predvajano: pesem ni najdena';
      }
    })
    .catch(error => console.error('Napaka pri pridobivanju trenutne pesmi:', error));
}

// Pridobivanje trenutno predvajane pesmi vsakih 5 sekund
getCurrentSong();
setInterval(getCurrentSong, 5000);
