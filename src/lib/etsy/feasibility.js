// Étude de faisabilité affichée dans l'onglet (même contenu que docs/ETSY_SOURCING.md).
export const FEASIBILITY = [
  {
    id: 'free', title: 'Réalisable avec l’API, sans frais', tone: 'ok',
    note: 'Avec une application Etsy approuvée (Personal App), dans les quotas de la clé.',
    items: [
      { label: 'Recherche de boutique par nom', how: 'findShops · GET /v3/application/shops?shop_name=' },
      { label: 'Fiche boutique : ventes cumulées, favoris, avis 12 mois, fiches actives, devise, création', how: 'getShop · transaction_sold_count, num_favorers, review_count, review_average, listing_active_count, currency_code, create_date' },
      { label: 'Catalogue actif : titre, prix minimum, devise, favoris, stock, tags, matériaux, catégorie, type, ancienneté', how: 'findAllActiveListingsByShop (limit ≤ 100 + offset)' },
      { label: 'Images des fiches', how: 'getListingsByListingIds · includes=Images (par lots de 100)' },
      { label: 'Avis datés par fiche', how: 'getReviewsByShop / getReviewsByListing · listing_id, rating, create_timestamp' },
      { label: 'Catégories', how: 'getSellerTaxonomyNodes' },
    ],
  },
  {
    id: 'auth', title: 'Nécessite une autorisation supplémentaire', tone: 'warn',
    items: [
      { label: 'Collecte pour analytics / comparatif de boutiques tierces', how: 'Autorisation écrite d’Etsy (conditions API) → ETSY_LIVE_ENABLED' },
      { label: 'Conservation et suivi des compteurs dans le temps', how: 'Autorisation + durée de conservation → ETSY_TRACKING_ALLOWED (purge 90 j par défaut)' },
      { label: 'Volume au-delà d’une Personal App', how: 'Commercial Access (revue manuelle), quotas supérieurs via developer@etsy.com' },
      { label: 'Transactions réelles d’une boutique', how: 'OAuth transactions_r, seulement par la boutique elle-même ; entraînement = consentement séparé' },
    ],
  },
  {
    id: 'calib', title: 'Nécessite des données de calibration', tone: 'info',
    items: [
      { label: 'Ventes estimées par produit', how: 'Transactions de boutiques volontaires (consentement à l’entraînement) + validation hors échantillon' },
      { label: 'CA estimé (scénario brut)', how: 'Seulement à partir de ventes estimées validées × prix affiché' },
      { label: 'Tendances', how: 'Plusieurs observations autorisées dans le temps' },
    ],
  },
  {
    id: 'none', title: 'Non disponible', tone: 'off',
    items: [
      { label: 'Ventes par produit', how: 'L’API ne donne que le compteur global de la boutique' },
      { label: 'Vues des fiches', how: 'Champ absent du schéma ShopListing actuel' },
      { label: 'Prix historiques, promotions, variantes vendues, remboursements, frais réels', how: 'Non exposés ; fiches vendues privées' },
      { label: 'Historique antérieur à la première observation', how: 'Jamais reconstruit à partir d’une seule lecture' },
    ],
  },
]
