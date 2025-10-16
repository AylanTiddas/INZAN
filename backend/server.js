// backend/server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// --- Chargement et préparation des données ---
// On charge les proverbes une seule fois au démarrage du serveur.
const proverbsPath = path.join(__dirname, 'proverbs.json');
const proverbsData = JSON.parse(fs.readFileSync(proverbsPath, 'utf8'));

// Fonction de normalisation du texte (la même que sur le frontend)
const normalizeText = (text) => {
    if (!text) return '';
    return text.toLowerCase()
        .replace(/[ǧǧčṣṭẓ]/g, c => ({ 'ǧ': 'g', 'č': 'c', 'ṣ': 's', 'ṭ': 't', 'ẓ': 'z' }[c]))
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
};

// On pré-calcule les versions normalisées pour des recherches ultra-rapides.
const proverbs = proverbsData.map((p, index) => ({
    ...p,
    id: index,
    kabyle_norm: normalizeText(p.kabyle),
    francais_norm: normalizeText(p.francais),
    theme_norm: normalizeText(p.theme)
}));

console.log(`${proverbs.length} proverbes chargés et prêts.`);

// --- Configuration du serveur ---
app.use(cors()); // Autorise les requêtes depuis d'autres origines (votre frontend)
app.use(express.json()); // Permet au serveur de comprendre le JSON

// --- Définition de l'API ---
// C'est ici que la magie opère.
app.get('/api/proverbs', (req, res) => {
    // On récupère les paramètres de la requête (recherche, thème, page)
    const { search, theme, page = 0, limit = 50 } = req.query;

    let results = proverbs;

    // 1. Filtrage par recherche
    if (search) {
        const normalizedSearch = normalizeText(search);
        const keywords = normalizedSearch.split(' ').filter(k => k.length > 0);
        results = results.filter(p => {
            const searchableText = `${p.kabyle_norm} ${p.francais_norm} ${p.theme_norm}`;
            return keywords.every(keyword => searchableText.includes(keyword));
        });
    }

    // 2. Filtrage par thème
    if (theme && theme !== 'tous') {
        const normalizedTheme = normalizeText(theme);
        results = results.filter(p => p.theme_norm.includes(normalizedTheme));
    }

    // 3. Pagination des résultats
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const startIndex = pageNum * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedResults = results.slice(startIndex, endIndex);

    // 4. On envoie la réponse
    res.json({
        totalResults: results.length,
        currentPage: pageNum,
        proverbs: paginatedResults
    });
});

// --- Démarrage du serveur ---
app.listen(PORT, () => {
    console.log(`Serveur de proverbes démarré sur http://localhost:${PORT}`);
});
