$(document).ready(function () {
    // Inicializacija Semantic UI
    $('.ui.dropdown').dropdown({ on: 'hover' });

    // Dodaj iskanje
    $('#searchInput').on('input', function () {
        filterSongs($(this).val());
    });

    // Filtriranje pesmi glede na vnos uporabnika
    function filterSongs(query) {
        query = query.toLowerCase();
        $('.ui.segment').each(function () {
            var songName = $(this).find('.ui.header').text().toLowerCase();
            if (songName.includes(query)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    }
});

// Funkcija za izbris pesmi
function deleteSong(songName) {
    console.log(`Deleting song: ${songName}`); // Debugging log
    $.ajax({
        url: `/delete-song/${encodeURIComponent(songName)}`,
        type: 'DELETE',
        success: function (data) {
            console.log(data.message);
            refreshPage();
        },
        error: function (error) {
            console.error('Napaka pri izbrisu pesmi:', error.responseJSON.error);
            showErrorMessage(error.responseJSON.error);
        }
    });
}

// Funkcija za dodajanje pesmi na seznam predvajanja
function addToPlaylist(songName) {
    console.log(`Adding to playlist: ${songName}`); // Debugging log
    $.ajax({
        url: `/add-to-playlist/${encodeURIComponent(songName)}`,
        type: 'POST',
        success: function (data) {
            console.log(data.message);
            refreshPage();
        },
        error: function (error) {
            console.error('Napaka pri dodajanju pesmi na seznam predvajanja:', error.responseJSON.error);
            showErrorMessage(error.responseJSON.error);
        }
    });
}

// Funkcija za odstranjevanje pesmi s seznama predvajanja
function removeFromPlaylist(songName) {
    console.log(`Removing from playlist: ${songName}`); // Debugging log
    $.post(`/remove-from-playlist/${encodeURIComponent(songName)}`, function (data) {
        console.log(data.message);
        refreshPage();
    })
    .fail(function (error) {
        console.error('Napaka pri odstranjevanju pesmi s seznama predvajanja:', error.responseJSON.error);
        showErrorMessage(error.responseJSON.error);
    });
}

// Ponovno naloži stran ali izvedi dodatne korake po potrebi
function refreshPage() {
    location.reload();
}

// Funkcija za prikazovanje obvestila o napaki
function showErrorMessage(message) {
    console.log(`Error message: ${message}`); // Debugging log
    $('#errorMessage').text(message); // Izpiši sporočilo napake v element z ID-jem "errorMessage"
    $('#errorAlert').removeClass('d-none'); // Prikazi div z napako
    document.getElementById("searchInput").scrollIntoView({ behavior: 'smooth', block: 'start' }); // Skrolamo na napako
}
