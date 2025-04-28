// File: script.js (Versione con gestione errore caricamento con immagini PNG)

document.addEventListener('DOMContentLoaded', () => {
    // --- Costanti DOM ---
    const addReviewBtn = document.getElementById('add-review-btn');
    const reviewFormContainer = document.getElementById('review-form-container');
    const cancelReviewBtn = document.getElementById('cancel-review-btn');
    const gelateriaForm = document.getElementById('gelateria-form');
    const reviewsListContainer = document.getElementById('reviews-list');
    const noReviewsMessage = reviewsListContainer.querySelector('#no-reviews-message');
    const starRatingDivs = document.querySelectorAll('.star-rating');
    const loadingSpinner = createLoadingSpinner();
    reviewsListContainer.parentNode.insertBefore(loadingSpinner, reviewsListContainer);

    // --- URL delle Netlify Functions ---
    const GET_REVIEWS_URL = '/.netlify/functions/get-reviews';
    const SAVE_REVIEW_URL = '/.netlify/functions/save-review';

    let reviewsCache = [];

    // ----- Gestione Visibilità Form -----
    addReviewBtn.addEventListener('click', () => {
        reviewFormContainer.classList.remove('hidden');
        addReviewBtn.classList.add('hidden');
        resetForm();
    });

    cancelReviewBtn.addEventListener('click', () => {
        reviewFormContainer.classList.add('hidden');
        addReviewBtn.classList.remove('hidden');
    });

    // ----- Logica Stelle con immagini -----
    try {
        starRatingDivs.forEach(ratingDiv => {
            const stars = ratingDiv.querySelectorAll('img.star');
            const ratingType = ratingDiv.dataset.ratingType;
            const hiddenInput = document.getElementById(`${ratingType}-rating`);

            if (!hiddenInput) {
                console.error(`Input nascosto non trovato per ratingType: ${ratingType}`);
                return;
            }

            stars.forEach(star => {
                star.addEventListener('mouseover', () => highlightStars(stars, star.dataset.value));
                star.addEventListener('mouseout', () => resetStarsHighlight(stars, hiddenInput.value));
                star.addEventListener('click', () => selectStarRating(stars, star.dataset.value, hiddenInput));
            });
        });
    } catch (error) {
        console.error("Errore nell'inizializzazione delle stelle:", error);
    }

    function highlightStars(stars, hoverValue) {
        stars.forEach(s => {
            s.src = (s.dataset.value <= hoverValue)
                ? 'stella-piena.png'
                : 'stella-vuota.png';
        });
    }
    function resetStarsHighlight(stars, selectedValue) {
        stars.forEach(s => {
            s.src = (s.dataset.value <= selectedValue)
                ? 'stella-piena.png'
                : 'stella-vuota.png';
        });
    }
    function selectStarRating(stars, value, hiddenInput) {
        hiddenInput.value = value;
        resetStarsHighlight(stars, value);
    }

    // ----- Gestione Form e Recensioni -----
    gelateriaForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const saveButton = gelateriaForm.querySelector('button[type="submit"]');
        saveButton.disabled = true;
        saveButton.textContent = 'Salvataggio...';

        const reviewData = {
            name: document.getElementById('gelateria-name').value.trim(),
            author: document.getElementById('reviewer-name').value.trim(),
            mapsLink: document.getElementById('maps-link').value.trim(),
            variety: document.getElementById('variety-rating').value,
            taste: document.getElementById('taste-rating').value,
            overall: document.getElementById('overall-rating').value,
            panna: document.querySelector('input[name="panna"]:checked')?.value || '',
            prezzo: document.querySelector('input[name="prezzo"]:checked')?.value || '',
            notes: document.getElementById('notes').value.trim()
        };

        if (!reviewData.name || !reviewData.author || !reviewData.variety || !reviewData.taste || !reviewData.overall || !reviewData.panna || !reviewData.prezzo) {
            alert('Per favore, compila tutti i campi obbligatori!');
            saveButton.disabled = false;
            saveButton.textContent = 'Salva Recensione!';
            return;
        }

        try {
            const response = await fetch(SAVE_REVIEW_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reviewData),
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({ message: 'Errore sconosciuto.' }));
                throw new Error(`Errore HTTP ${response.status}: ${errorBody.message}`);
            }

            const result = await response.json();
            reviewData.id = result.id || Date.now();
            addReviewToDOM(reviewData);

            reviewFormContainer.classList.add('hidden');
            addReviewBtn.classList.remove('hidden');
            resetForm();

        } catch (error) {
            console.error('Errore durante l\'invio della recensione:', error);
            alert(`Errore nel salvataggio: ${error.message}`);
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'Salva Recensione!';
        }
    });

    function resetForm() {
        gelateriaForm.reset();
        try {
            starRatingDivs.forEach(ratingDiv => {
                const stars = ratingDiv.querySelectorAll('img.star');
                const ratingType = ratingDiv.dataset.ratingType;
                const hiddenInput = document.getElementById(`${ratingType}-rating`);
                if (hiddenInput) {
                    hiddenInput.value = '';
                    resetStarsHighlight(stars, 0);
                }
            });
        } catch (e) {
            console.error("Errore nel reset stelle:", e);
        }
    }

    // ----- Funzioni per il DOM (Visualizzazione) -----
    function addReviewToDOM(review) {
        if (noReviewsMessage) noReviewsMessage.style.display = 'none';
        const card = document.createElement('div');
        card.classList.add('review-card');
        card.dataset.id = review.id;

        card.innerHTML = `
          <h3>${escapeHTML(review.name)}</h3>
          <span class="review-date">${formatDate(review.createdAt)}</span>
          ${review.mapsLink ? `<a href="${escapeHTML(review.mapsLink)}" target="_blank" class="map-link">📍 Vedi su Mappa</a>` : ''}
          <p><span class="label">Voto Complessivo:</span> <span class="stars-display">${generateStarsHTML(review.overall)}</span></p>
          <hr style="border-style: dashed; border-width: 1px; margin: 8px 0;">
          <p><span class="label">Varietà Gusti:</span> <span class="stars-display">${generateStarsHTML(review.variety)}</span></p>
          <p><span class="label">Quanto è Buono?:</span> <span class="stars-display">${generateStarsHTML(review.taste)}</span></p>
          <p><span class="label">Panna:</span> ${escapeHTML(review.panna)}</p>
          <p><span class="label">Prezzo:</span> ${escapeHTML(review.prezzo)}</p>
          ${review.notes ? `<div class="notes"><span class="label">Note:</span> ${escapeHTML(review.notes)}</div>` : ''}
          <p><span class="label">Recensito da:</span> ${escapeHTML(review.author)}</p>
        `;
        reviewsListContainer.appendChild(card);
    }

    function generateStarsHTML(rating) {
        let html = '';
        const filled = parseInt(rating) || 0;
        for (let i = 1; i <= 5; i++) {
            html += `
              <img class="star-display"
                   src="${i <= filled ? 'stella-piena.png' : 'stella-vuota.png'}"
                   alt="${i <= filled ? 'Stella piena' : 'Stella vuota'}" />`;
        }
        return html;
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatDate(ts) {
        let date = ts && ts._seconds
            ? new Date(ts._seconds * 1000)
            : new Date(ts);
        return date.toLocaleDateString('it-IT', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
    }

    function renderReviews(arr, sortByDate = false) {
        reviewsListContainer.querySelectorAll('.review-card').forEach(c => c.remove());
        if (arr.length === 0) {
            noReviewsMessage.style.display = 'block';
            return;
        }
        noReviewsMessage.style.display = 'none';

        let list = [...arr];
        if (sortByDate) {
            list.sort((a, b) => {
                const da = a.createdAt?._seconds || Date.parse(a.createdAt);
                const db = b.createdAt?._seconds || Date.parse(b.createdAt);
                return db - da;
            });
        }
        list.forEach(r => addReviewToDOM(r));
    }

    async function fetchAndDisplayReviews() {
        showLoading(true);
        try {
            const resp = await fetch(GET_REVIEWS_URL);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            reviewsCache = await resp.json();
            renderReviews(reviewsCache, true);
        } catch (err) {
            console.error(err);
            noReviewsMessage.textContent = `Errore: ${err.message}`;
            noReviewsMessage.style.color = 'red';
            noReviewsMessage.style.display = 'block';
        } finally {
            showLoading(false);
        }
    }

    document.getElementById('sort-date').addEventListener('click', () => renderReviews(reviewsCache, true));
    document.getElementById('sort-stars').addEventListener('click', () => {
        const byStars = [...reviewsCache].sort((a, b) => b.overall - a.overall);
        renderReviews(byStars, false);
    });

    function createLoadingSpinner() {
        const spinner = document.createElement('div');
        spinner.id = 'loading-spinner';
        spinner.style.display = 'none';
        spinner.style.textAlign = 'center';
        spinner.style.padding = '30px';
        spinner.innerHTML = `...`; // Puoi mettere un vero SVG o CSS spinner
        return spinner;
    }
    function showLoading(isLoading) {
        loadingSpinner.style.display = isLoading ? 'block' : 'none';
        if (isLoading && noReviewsMessage) noReviewsMessage.style.display = 'none';
    }

    // Caricamento iniziale
    fetchAndDisplayReviews();
});
