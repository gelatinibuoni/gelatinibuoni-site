// File: script.js (Versione con stelle PNG, sorting, date e editing)

document.addEventListener('DOMContentLoaded', () => {
    // --- Costanti DOM ---
    const addReviewBtn        = document.getElementById('add-review-btn');
    const reviewFormContainer = document.getElementById('review-form-container');
    const cancelReviewBtn     = document.getElementById('cancel-review-btn');
    const gelateriaForm       = document.getElementById('gelateria-form');
    const reviewsListContainer= document.getElementById('reviews-list');
    const noReviewsMessage    = reviewsListContainer.querySelector('#no-reviews-message');
    const starRatingDivs      = document.querySelectorAll('.star-rating img.star');
    const loadingSpinner      = createLoadingSpinner();
    reviewsListContainer.parentNode.insertBefore(loadingSpinner, reviewsListContainer);
  
    // --- URL delle Netlify Functions ---
    const GET_REVIEWS_URL    = '/.netlify/functions/get-reviews';
    const SAVE_REVIEW_URL    = '/.netlify/functions/save-review';
    const UPDATE_REVIEW_URL  = '/.netlify/functions/update-review';
  
    let reviewsCache = [];
    let editingId    = null;
  
    // ----- Gestione Visibilità Form -----
    addReviewBtn.addEventListener('click', () => {
      editingId = null;
      gelateriaForm.querySelector('button[type="submit"]').textContent = 'Salva Recensione!';
      reviewFormContainer.classList.remove('hidden');
      addReviewBtn.classList.add('hidden');
      resetForm();
    });
    cancelReviewBtn.addEventListener('click', () => {
      reviewFormContainer.classList.add('hidden');
      addReviewBtn.classList.remove('hidden');
      editingId = null;
    });
  
    // ----- Logica Stelle con immagini -----
    starRatingDivs.forEach(star => {
      const ratingDiv = star.closest('.star-rating');
      const stars     = ratingDiv.querySelectorAll('img.star');
      const ratingType= ratingDiv.dataset.ratingType;
      const hiddenInput = document.getElementById(`${ratingType}-rating`);
  
      stars.forEach(s => {
        s.addEventListener('mouseover', () => highlightStars(stars, s.dataset.value));
        s.addEventListener('mouseout',  () => resetStarsHighlight(stars, hiddenInput.value));
        s.addEventListener('click',     () => selectStarRating(stars, s.dataset.value, hiddenInput));
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
      const submitBtn = gelateriaForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = editingId ? 'Aggiornamento...' : 'Salvataggio...';
  
      // raccogli i dati
      const reviewData = {
        name     : document.getElementById('gelateria-name').value.trim(),
        author   : document.getElementById('reviewer-name').value.trim(),
        mapsLink : document.getElementById('maps-link').value.trim(),
        variety  : document.getElementById('variety-rating').value,
        taste    : document.getElementById('taste-rating').value,
        overall  : document.getElementById('overall-rating').value,
        panna    : document.querySelector('input[name="panna"]:checked')?.value || '',
        prezzo   : document.querySelector('input[name="prezzo"]:checked')?.value || '',
        notes    : document.getElementById('notes').value.trim()
      };
  
      // validazione
      if (!reviewData.name || !reviewData.author || !reviewData.variety ||
          !reviewData.taste || !reviewData.overall || !reviewData.panna || !reviewData.prezzo) {
        alert('Per favore, compila tutti i campi obbligatori!');
        submitBtn.disabled = false;
        submitBtn.textContent = editingId ? 'Aggiorna Recensione' : 'Salva Recensione!';
        return;
      }
  
      try {
        const endpoint = editingId ? UPDATE_REVIEW_URL : SAVE_REVIEW_URL;
        if (editingId) reviewData.id = editingId;
  
        const resp = await fetch(endpoint, {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify(reviewData)
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ message: 'Errore sconosciuto.' }));
          throw new Error(err.message);
        }
  
        const result = await resp.json();
        // se è una nuova review
        if (!editingId) {
          reviewData.id = result.id || Date.now();
          // memorizza in localStorage
          const mine = JSON.parse(localStorage.getItem('myReviews')||'[]');
          mine.unshift(reviewData.id);
          localStorage.setItem('myReviews', JSON.stringify(mine));
          // aggiungi in testa cache
          reviewsCache.unshift(reviewData);
        } else {
          // update cache entry, mantieni createdAt
          const idx = reviewsCache.findIndex(r => r.id === editingId);
          reviewsCache[idx] = { id: editingId, ...reviewData, createdAt: reviewsCache[idx].createdAt };
          editingId = null;
        }
  
        renderReviews(reviewsCache, true);
  
        reviewFormContainer.classList.add('hidden');
        addReviewBtn.classList.remove('hidden');
        submitBtn.textContent = 'Salva Recensione!';
        resetForm();
  
      } catch (error) {
        console.error(error);
        alert(`Errore: ${error.message}`);
      } finally {
        submitBtn.disabled = false;
      }
    });
  
    function resetForm() {
      gelateriaForm.reset();
      editingId = null;
      // reset stelle
      document.querySelectorAll('.star-rating img.star')
        .forEach(s => s.src = 'stella-vuota.png');
    }
  
    // ----- Visualizzazione recensioni -----
    function addReviewToDOM(review) {
      noReviewsMessage.style.display = 'none';
      const card = document.createElement('div');
      card.className = 'review-card';
      card.dataset.id = review.id;
  
      // build innerHTML
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
  
      // mostra tasto "Modifica" se è tra le tue
      const mine = JSON.parse(localStorage.getItem('myReviews')||'[]');
      if (mine.includes(review.id)) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-edit';
        btn.textContent = '✏️ Modifica';
        btn.addEventListener('click', () => startEdit(review));
        card.appendChild(btn);
      }
  
      reviewsListContainer.appendChild(card);
    }
  
    function startEdit(review) {
      // pre-riempi il form
      document.getElementById('gelateria-name').value     = review.name;
      document.getElementById('reviewer-name').value      = review.author;
      document.getElementById('maps-link').value          = review.mapsLink;
      ['variety','taste','overall'].forEach(type => {
        const val = review[type];
        const div = document.querySelector(`.star-rating[data-rating-type="${type}"]`);
        const stars = div.querySelectorAll('img.star');
        const hidden = document.getElementById(`${type}-rating`);
        hidden.value = val;
        resetStarsHighlight(stars, val);
      });
      // panna / prezzo
      document.querySelectorAll('input[name="panna"]').forEach(r=> r.checked = (r.value===review.panna));
      document.querySelectorAll('input[name="prezzo"]').forEach(r=> r.checked = (r.value===review.prezzo));
      document.getElementById('notes').value = review.notes || '';
  
      // set editing state
      editingId = review.id;
      gelateriaForm.querySelector('button[type="submit"]').textContent = 'Aggiorna Recensione';
      reviewFormContainer.classList.remove('hidden');
      addReviewBtn.classList.add('hidden');
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
      const d = ts?._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
      return d.toLocaleDateString('it-IT', { day:'2-digit', month:'long', year:'numeric' });
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
        list.sort((a,b) => {
          const da = a.createdAt?._seconds || Date.parse(a.createdAt);
          const db = b.createdAt?._seconds || Date.parse(b.createdAt);
          return db - da;
        });
      }
      list.forEach(r => addReviewToDOM(r));
    }
    document.getElementById('sort-date').addEventListener('click', () => renderReviews(reviewsCache, true));
    document.getElementById('sort-stars').addEventListener('click', () => {
      const byStars = [...reviewsCache].sort((a,b) => b.overall - a.overall);
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
  