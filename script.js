// File: script.js (Versione definitiva con stelle PNG, sorting e data)

document.addEventListener('DOMContentLoaded', () => {
    // --- Costanti DOM ---
    const addReviewBtn = document.getElementById('add-review-btn');
    const reviewFormContainer = document.getElementById('review-form-container');
    const cancelReviewBtn = document.getElementById('cancel-review-btn');
    const gelateriaForm = document.getElementById('gelateria-form');
    const reviewsListContainer = document.getElementById('reviews-list');
    const noReviewsMessage = reviewsListContainer.querySelector('#no-reviews-message');
    const starRatingDivs = document.querySelectorAll('.star-rating img.star');
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
    starRatingDivs.forEach(star => {
        const ratingDiv = star.closest('.star-rating');
        const stars = ratingDiv.querySelectorAll('img.star');
        const ratingType = ratingDiv.dataset.ratingType;
        const hiddenInput = document.getElementById(`${ratingType}-rating`);

        stars.forEach(s => {
            s.addEventListener('mouseover', () => highlightStars(stars, s.dataset.value));
            s.addEventListener('mouseout', () => resetStarsHighlight(stars, hiddenInput.value));
            s.addEventListener('click', () => selectStarRating(stars, s.dataset.value, hiddenInput));
        });
    });

    function highlightStars(stars, hoverValue) {
        stars.forEach(s => {
            s.src = (s.dataset.value <= hoverValue) ? 'stella-piena.png' : 'stella-vuota.png';
        });
    }
    function resetStarsHighlight(stars, selectedValue) {
        stars.forEach(s => {
            s.src = (s.dataset.value <= selectedValue) ? 'stella-piena.png' : 'stella-vuota.png';
        });
    }
    function selectStarRating(stars, value, hiddenInput) {
        hiddenInput.value = value;
        resetStarsHighlight(stars, value);
    }

    // ----- Gestione submit form -----
    gelateriaForm.addEventListener('submit', async event => {
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

        if (!reviewData.name || !reviewData.author || !reviewData.variety || !reviewData.taste
            || !reviewData.overall || !reviewData.panna || !reviewData.prezzo) {
            alert('Per favore, compila tutti i campi obbligatori!');
            saveButton.disabled = false;
            saveButton.textContent = 'Salva Recensione!';
            return;
        }

        try {
            const response = await fetch(SAVE_REVIEW_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reviewData)
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({ message: 'Errore sconosciuto.' }));
                throw new Error(err.message);
            }
            const result = await response.json();
            reviewData.id = result.id || Date.now();
            addReviewToDOM(reviewData);

            reviewFormContainer.classList.add('hidden');
            addReviewBtn.classList.remove('hidden');
            resetForm();
        } catch (error) {
            console.error(error);
            alert(`Errore nel salvataggio: ${error.message}`);
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'Salva Recensione!';
        }
    });

    function resetForm() {
        gelateriaForm.reset();
        // reset stelle
        document.querySelectorAll('.star-rating img.star').forEach(s => s.src = 'stella-vuota.png');
    }

    // ----- Visualizzazione recensioni -----
    function addReviewToDOM(review) {
        noReviewsMessage.style.display = 'none';
        const card = document.createElement('div');
        card.className = 'review-card';
        card.dataset.id = review.id;
        card.innerHTML = `
            <h3>${escapeHTML(review.name)}</h3>
            <span class="review-date">${formatDate(review.createdAt)}</span>
            ${ review.mapsLink
                ? `<a href="${escapeHTML(review.mapsLink)}" target="_blank" class="map-link">📍 Vedi su Mappa</a>`
                : '' }
            <p><span class="label">Voto Complessivo:</span> ${generateStarsHTML(review.overall)}</p>
            <hr>
            <p><span class="label">Varietà Gusti:</span> ${generateStarsHTML(review.variety)}</p>
            <p><span class="label">Quanto è Buono?:</span> ${generateStarsHTML(review.taste)}</p>
            <p><span class="label">Panna:</span> ${escapeHTML(review.panna)}</p>
            <p><span class="label">Prezzo:</span> ${escapeHTML(review.prezzo)}</p>
            ${ review.notes
                ? `<div class="notes"><span class="label">Note:</span> ${escapeHTML(review.notes)}</div>`
                : '' }
            <p><span class="label">Recensito da:</span> ${escapeHTML(review.author)}</p>
        `;
        reviewsListContainer.appendChild(card);
    }
    function generateStarsHTML(rating) {
        let html = '';
        const filled = parseInt(rating) || 0;
        for (let i = 1; i <= 5; i++) {
            html += `<img class="star-display" src="${i <= filled ? 'stella-piena.png' : 'stella-vuota.png'}" alt="stella" />`;
        }
        return html;
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    function formatDate(ts) {
        const d = ts?._seconds
            ? new Date(ts._seconds * 1000)
            : new Date(ts);
        return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    // ----- Sorting -----
    function renderReviews(arr, sortByDate = false) {
        reviewsListContainer.querySelectorAll('.review-card').forEach(c => c.remove());
        if (arr.length === 0) {
            noReviewsMessage.style.display = 'block';
            return;
        }
        noReviewsMessage.style.display = 'none';
        const list = [...arr];
        if (sortByDate) {
            list.sort((a, b) => {
                const da = a.createdAt?._seconds || Date.parse(a.createdAt);
                const db = b.createdAt?._seconds || Date.parse(b.createdAt);
                return db - da;
            });
        }
        list.forEach(r => addReviewToDOM(r));
    }
    document.getElementById('sort-date').addEventListener('click', () => renderReviews(reviewsCache, true));
    document.getElementById('sort-stars').addEventListener('click', () => {
        const byStars = [...reviewsCache].sort((a, b) => b.overall - a.overall);
        renderReviews(byStars, false);
    });

    // ----- Fetch iniziale -----
    async function fetchAndDisplayReviews() {
        loadingSpinner.style.display = 'block';
        try {
            const res = await fetch(GET_REVIEWS_URL);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            reviewsCache = await res.json();
            renderReviews(reviewsCache, true);
        } catch (err) {
            console.error(err);
            noReviewsMessage.textContent = `Errore: ${err.message}`;
            noReviewsMessage.style.color = 'red';
            noReviewsMessage.style.display = 'block';
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }
    fetchAndDisplayReviews();

    // ----- Spinner -----
    function createLoadingSpinner() {
        const sp = document.createElement('div');
        sp.id = 'loading-spinner';
        sp.style.display = 'none';
        sp.style.textAlign = 'center';
        sp.style.padding = '20px';
        sp.textContent = 'Caricamento...';
        return sp;
    }
});
