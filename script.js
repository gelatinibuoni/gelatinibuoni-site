// File: script.js (Versione con gestione errore caricamento separata)

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

    // ----- Logica Stelle -----
    // **IMPORTANTE**: Assicuriamoci che questo codice venga eseguito
    // anche se fetchAndDisplayReviews fallisce dopo.
    try {
        starRatingDivs.forEach(ratingDiv => {
            const stars = ratingDiv.querySelectorAll('span');
            const ratingType = ratingDiv.dataset.ratingType;
            const hiddenInput = document.getElementById(`${ratingType}-rating`);

            if (!hiddenInput) {
                console.error(`Input nascosto non trovato per ratingType: ${ratingType}`);
                return; // Salta se l'input non c'è
            }

            stars.forEach(star => {
                star.addEventListener('mouseover', () => highlightStars(stars, star.dataset.value));
                star.addEventListener('mouseout', () => resetStarsHighlight(stars, hiddenInput.value));
                star.addEventListener('click', () => selectStarRating(stars, star.dataset.value, hiddenInput));
            });
        });
    } catch (error) {
        console.error("Errore nell'inizializzazione delle stelle:", error);
        // Non bloccare il resto dello script se le stelle falliscono
    }

    // Funzioni delle stelle (definite qui per essere sicuri che esistano)
    function highlightStars(stars, hoverValue) {
        stars.forEach(s => {
            s.classList.toggle('hovered', s.dataset.value <= hoverValue);
            s.textContent = s.dataset.value <= hoverValue ? '★' : '☆';
        });
    }
    function resetStarsHighlight(stars, selectedValue) {
        stars.forEach(s => {
            const isSelected = s.dataset.value <= selectedValue;
            s.classList.remove('hovered');
            s.classList.toggle('selected', isSelected);
            s.textContent = isSelected ? '★' : '☆';
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
            panna: document.querySelector('input[name="panna"]:checked') ? document.querySelector('input[name="panna"]:checked').value : '',
            prezzo: document.querySelector('input[name="prezzo"]:checked') ? document.querySelector('input[name="prezzo"]:checked').value : '',
            notes: document.getElementById('notes').value.trim()
        };

        if (!reviewData.name || !reviewData.author || !reviewData.variety || !reviewData.taste || !reviewData.overall || !reviewData.panna || !reviewData.prezzo ) {
            alert('Per favore, compila tutti i campi obbligatori!');
            saveButton.disabled = false;
            saveButton.textContent = 'Salva Recensione!';
            return;
        }

        try {
            const response = await fetch(SAVE_REVIEW_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify(reviewData),
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({ message: 'Errore sconosciuto.' }));
                throw new Error(`Errore HTTP ${response.status}: ${errorBody.message || 'Salvataggio fallito'}`);
            }

            const result = await response.json();
            console.log('Recensione salvata:', result);

            // Aggiungi al DOM per feedback immediato
            reviewData.id = result.id || Date.now();
            addReviewToDOM(reviewData);

            reviewFormContainer.classList.add('hidden');
            addReviewBtn.classList.remove('hidden');
            resetForm();

            // **NON** ricarichiamo automaticamente la lista dopo il salvataggio
            // per evitare di far riapparire l'errore di caricamento subito.
            // fetchAndDisplayReviews();

        } catch (error) {
            console.error('Errore durante l\'invio della recensione:', error);
            alert(`Si è verificato un errore nel salvataggio: ${error.message}\nControlla i log della funzione 'save-review' su Netlify se il problema persiste.`);
        } finally {
             saveButton.disabled = false;
             saveButton.textContent = 'Salva Recensione!';
        }
    });

    function resetForm() {
        gelateriaForm.reset();
        // Resetta anche le stelle
        try {
            starRatingDivs.forEach(ratingDiv => {
                const stars = ratingDiv.querySelectorAll('span');
                const ratingType = ratingDiv.dataset.ratingType;
                const hiddenInput = document.getElementById(`${ratingType}-rating`);
                if(hiddenInput) {
                    hiddenInput.value = '';
                    resetStarsHighlight(stars, 0);
                }
            });
        } catch(e){ console.error("Errore nel reset stelle:", e); }
    }

    // ----- Funzioni per il DOM (Visualizzazione) -----
    function addReviewToDOM(review) {
        // (Codice di addReviewToDOM è identico a prima)
        if (noReviewsMessage && noReviewsMessage.style.display !== 'none') {
             noReviewsMessage.style.display = 'none';
        }
        const reviewCard = document.createElement('div');
        reviewCard.classList.add('review-card');
        reviewCard.dataset.id = review.id;
        reviewCard.innerHTML = `
            <h3>${escapeHTML(review.name)}</h3>
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
        reviewsListContainer.insertBefore(reviewCard, reviewsListContainer.children[1]);
    }
     function generateStarsHTML(rating) { // Invariato
        let starsHTML = '';
        const filledStars = parseInt(rating) || 0;
        for (let i = 1; i <= 5; i++) {
            starsHTML += `<span class="${i <= filledStars ? 'filled' : 'empty'}">${i <= filledStars ? '★' : '☆'}</span>`;
        }
        return starsHTML;
    }
     function escapeHTML(str) { // Invariato
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // ----- Funzione per CARICARE e VISUALIZZARE (ora non blocca le stelle) -----
    async function fetchAndDisplayReviews() {
        showLoading(true);
        try {
            const response = await fetch(GET_REVIEWS_URL);
            if (!response.ok) {
                // Leggi l'errore ma non bloccare tutto se non riesce
                 const errorBody = await response.json().catch(() => ({ message: 'Errore sconosciuto.' }));
                throw new Error(`Errore HTTP ${response.status}: ${errorBody.message || 'Impossibile caricare le recensioni.'}`);
            }
            const reviewsFromServer = await response.json();

            const existingCards = reviewsListContainer.querySelectorAll('.review-card');
            existingCards.forEach(card => card.remove());

            if (reviewsFromServer.length === 0) {
                if (noReviewsMessage) noReviewsMessage.style.display = 'block';
                noReviewsMessage.textContent = 'Nessuna recensione ancora inserita. Aggiungine una!'; // Messaggio standard
                noReviewsMessage.style.color = '#888'; // Colore standard
            } else {
                if (noReviewsMessage) noReviewsMessage.style.display = 'none';
                reviewsFromServer.forEach(review => addReviewToDOM(review));
            }

        } catch (error) {
            console.error('Errore durante il caricamento delle recensioni:', error);
            if (noReviewsMessage) {
                // Mostra l'errore ma non impedire al resto della pagina di funzionare
                noReviewsMessage.textContent = `Errore nel caricamento delle recensioni: ${error.message}. Riprova più tardi.`;
                noReviewsMessage.style.display = 'block';
                noReviewsMessage.style.color = 'red';
            }
            // **NON rilanciare l'errore per non bloccare le stelle**
        } finally {
             showLoading(false);
        }
    }

    // ----- Funzioni per lo spinner di caricamento -----
    // (Codice createLoadingSpinner e showLoading è identico a prima)
    function createLoadingSpinner() {
        const spinner = document.createElement('div');
        spinner.id = 'loading-spinner';
        spinner.style.display = 'none';
        spinner.style.textAlign = 'center';
        spinner.style.padding = '30px';
        spinner.innerHTML = `...`; // Omesso per brevità
        return spinner;
    }
     function showLoading(isLoading) {
        if (loadingSpinner) {
            loadingSpinner.style.display = isLoading ? 'block' : 'none';
        }
        if (isLoading && noReviewsMessage) {
            noReviewsMessage.style.display = 'none';
        }
    }


    // ----- Esegui il caricamento iniziale ALLA FINE -----
    // Chiamiamo la funzione per caricare, ma il codice delle stelle
    // è già stato eseguito prima e non verrà bloccato da eventuali errori qui.
    fetchAndDisplayReviews();

});