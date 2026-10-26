# Sourcing & comparatif Etsy

Onglet d'analyse de boutiques et de produits Etsy, inspiré **fonctionnellement** d'EverBee Product Analytics. Aucun code, aucune marque et aucune donnée EverBee ne sont repris. Budget API : 0 €.

État au 26/10/2026 : **interface et moteur livrés en mode démonstration (données synthétiques)**. Le connecteur Etsy réel est écrit mais **désactivé côté serveur**. Le moteur d'estimation est **non activé** faute de données de calibration.

## 1. Sources vérifiées

| Source | Statut de la vérification |
|---|---|
| Spécification OpenAPI v3 officielle (`https://www.etsy.com/openapi/generated/oas/3.0.0.json`, téléchargée le 26/10/2026) | Lue : endpoints, champs, paramètres et sécurité ci-dessous. |
| Guides développeur (`developers.etsy.com/documentation`) : authentification, limites de débit, types d'applications | Lus. |
| Conditions de l'API (`etsy.com/legal/api`) | **Non lisibles par nos outils** : la protection anti-robots d'Etsy bloque l'accès, y compris depuis le navigateur. Les règles reprises ici viennent de l'énoncé du besoin (autorisation écrite pour l'analytics) et d'une version archivée (fraîcheur des données de fiche : 6 h ; autres contenus : 24 h). **À relire en entier avant toute activation.** |

### Accès

- Toutes les requêtes exigent l'en-tête `x-api-key: <keystring>:<shared_secret>`. Les endpoints privés ou d'écriture exigent en plus OAuth 2.0.
- Types d'applications :
  - **Seller App** : limitée à la boutique du développeur.
  - **Personal App** : au-delà de sa boutique, mais à échelle limitée, avec une revue plus poussée.
  - **Commercial Access** : revue manuelle, et nécessite d'abord une Personal App approuvée.
  - Une clé ne permet donc pas, à elle seule, d'analyser toutes les boutiques.
- Le screen-scraping est interdit, et nous n'en faisons pas.
- Quotas par clé : QPS puis QPD (fenêtre glissante de 24 h). Les valeurs sont visibles dans le portail développeur. Réponses :
  - en-têtes `x-limit-per-second`, `x-remaining-this-second`, `x-limit-per-day`, `x-remaining-today` ;
  - en cas de dépassement, HTTP `429` avec `retry-after`.

## 2. Ce qui est réalisable, et à quelles conditions

### A. Réalisable avec l'API, sans frais, une fois une application approuvée

Toutes ces données sont « Observées » : on affiche la valeur actuelle, avec sa date de lecture.

| Besoin | Endpoint | Champs |
|---|---|---|
| Recherche de boutique par nom | `GET /v3/application/shops?shop_name=` (`findShops`, `limit` ≤ 100, `offset`) | `shop_id`, `shop_name`, `url` |
| Fiche boutique | `GET /v3/application/shops/{shop_id}` (`getShop`) | `transaction_sold_count` (ventes **cumulées de la boutique**), `num_favorers`, `review_count` et `review_average` (**12 derniers mois**), `listing_active_count`, `digital_listing_count`, `currency_code`, `create_date`, `shop_location_country_iso`, `is_vacation` |
| Catalogue actif | `GET /v3/application/shops/{shop_id}/listings/active` (`findAllActiveListingsByShop`, `limit` ≤ 100, `offset`) | `listing_id`, `title`, `price` (Money : `amount` / `divisor` / `currency_code`, **prix minimum**), `quantity`, `num_favorers`, `tags`, `materials`, `taxonomy_id`, `listing_type` (`physical` / `download` / `both`), `original_creation_timestamp`, `url`, `has_variations`, `when_made`, `who_made` |
| Plusieurs fiches à la fois | `GET /v3/application/listings/batch?listing_ids=` (`getListingsByListingIds`) | idem, `includes` possible (images) |
| Images | `GET /v3/application/listings/{listing_id}/images` | URL des images |
| Avis datés | `GET /v3/application/shops/{shop_id}/reviews` et `GET /v3/application/listings/{listing_id}/reviews` (`limit` ≤ 100, `min_created` / `max_created`) | `listing_id`, `rating`, `create_timestamp` |
| Catégories | `GET /v3/application/seller-taxonomy/nodes` | arbre des catégories (`taxonomy_id`) |

### B. Nécessite une autorisation supplémentaire

- **Collecte pour de l'analytics** (agrégation, comparatif de boutiques tierces) : il faut une **autorisation écrite d'Etsy**, d'après l'énoncé du besoin. Sans elle, la collecte réelle reste désactivée (`ETSY_LIVE_ENABLED`).
- **Conservation et suivi dans le temps** des compteurs (`transaction_sold_count`, favoris…) : il faut une autorisation d'Etsy, avec une durée de conservation définie. Désactivé par défaut (`ETSY_TRACKING_ALLOWED`), avec une purge automatique.
- **Volume** : au-delà d'une Personal App, il faut un Commercial Access ; au-delà des quotas, demander des limites plus élevées à developer@etsy.com.
- **Transactions réelles d'une boutique** (`getShopReceipts` / transactions, scope OAuth `transactions_r`) : seulement pour une boutique qui se connecte elle-même. **Le consentement à connecter la boutique ne vaut pas consentement à entraîner un modèle.** Il faut un accord séparé.

### C. Nécessite des données de calibration

- **Ventes estimées par produit** et **CA estimé (scénario brut)**. Il faut :
  1. les transactions de boutiques volontaires, avec un consentement explicite pour l'entraînement ;
  2. un historique d'observations autorisé ;
  3. une validation sur des boutiques et des périodes exclues de l'entraînement.
- **Tendances** : il faut plusieurs observations autorisées dans le temps.

### D. Non disponible

- **Ventes par produit** : l'API ne donne que le compteur global de la boutique.
- **Vues d'une fiche** : le champ n'existe plus dans le schéma `ShopListing` actuel.
- **Prix historiques, promotions, variantes vendues, remboursements, frais de livraison réellement payés.**
- **Fiches vendues** : « Sold product listings are private ».
- **Historique antérieur à notre première observation** : il ne se reconstruit jamais à partir d'une seule lecture.

## 3. Règles d'affichage des métriques

Chaque valeur porte : `source`, `observedAt` (date de lecture), `period`, `currency` et un `status` parmi « Observée », « Calculée », « Estimée » ou « Indisponible » (`src/lib/etsy/metrics.js`).

- **Absence de donnée** : une donnée absente reste `null`, avec le statut « Indisponible », et ne devient jamais 0.
- **Compteur de ventes** : `transaction_sold_count` est un cumul de **boutique**. Il n'est jamais réparti entre les produits.
- **Signaux qui ne sont pas des ventes** : les favoris, les avis et les variations de stock. Une fiche disparue ne signifie pas « vendue ».
- **Écart entre deux observations** : il est présenté comme une « **variation du compteur entre deux observations** », pas comme des commandes sur une période (`observations.js`).
  - Une baisse est traitée comme une **correction du compteur**, jamais comme des ventes négatives.
  - Une observation manquante produit un trou : pas d'interpolation.
- **Avis de la boutique** : `review_count` et `review_average` portent sur les **12 derniers mois**, et la période l'indique.
- **Devises** : aucune somme ni moyenne entre devises différentes. Les comparaisons gardent chaque devise séparée et le signalent.

## 4. Moteur d'estimation (`src/lib/etsy/estimation.js`)

Le moteur est indépendant de l'interface et du connecteur.

- **Signaux candidats** (ce sont des hypothèses, pas des preuves) : avis datés de la fiche, ancienneté, catégorie, prix, favoris, et variations du compteur de la boutique.
- **État actuel : aucun modèle validé.** `estimateListingSales` renvoie donc « Estimation non disponible », avec la liste des prérequis manquants.
- **Exclusions** : aucune formule universelle (du type « 1 avis = N ventes ») et aucune répartition arbitraire des ventes de la boutique entre ses produits.
- **Harnais de validation fourni** :
  - découpage par boutique et par période, sans fuite entre entraînement et test ;
  - **baseline simple** (taux médian ventes/avis appris par catégorie sur l'entraînement) ;
  - erreurs MAE, MAPE et biais par catégorie.
- **Activation** : un modèle ne peut être enregistré que s'il bat la baseline sur les données exclues et si ses erreurs sont documentées. Une fourchette n'est affichée que si la méthode la produit et l'a testée.
- **CA estimé** = ventes estimées × prix affiché actuel, uniquement si une estimation de ventes existe. Il est étiqueté « scénario brut ». Il ne reconstitue ni les prix historiques, ni les variantes, ni les promotions, remboursements, taxes ou frais de livraison. Ce n'est **ni un CA réel ni un bénéfice**.

## 5. Architecture et sécurité

| Couche | Fichiers |
|---|---|
| Métriques, normalisation et validation des réponses, observations, filtres et comparaisons, moteur d'estimation, données synthétiques. Fonctions pures, testées par `npm test`. | `src/lib/etsy/*.js` |
| Client serveur : en-tête `x-api-key`, pagination, `retry-after` avec backoff borné, lecture des quotas, validation des réponses, cache mémoire à durée limitée (fiches 6 h, autres 24 h). | `server/etsy/client.js` |
| Endpoint, **désactivé** tant que `ETSY_LIVE_ENABLED !== 'true'`. Exige une session Supabase et un email autorisé (`ETSY_ALLOWED_EMAILS`). Les secrets ne sont jamais renvoyés ni journalisés. | `api/etsy.js` |
| Données utilisateur : boutiques suivies, collections, favoris internes, notes, colonnes. Stockées dans `state.etsy`, propre à chaque compte (synchronisé via `user_state`). Aucune donnée Etsy réelle n'est stockée dans ce document. | `src/store/useStore.jsx` (v8) |
| Observations (si autorisées) : conservation limitée (90 jours et 200 observations par boutique par défaut), purgées à chaque ajout. | `src/lib/etsy/observations.js` |

### Variables d'environnement (Vercel, à créer seulement le moment venu)

- `ETSY_API_KEY` : le keystring.
- `ETSY_SHARED_SECRET` : le shared secret.
- `ETSY_LIVE_ENABLED=true` : seulement après l'approbation de l'application **et** l'autorisation écrite pour l'analytics.
- `ETSY_TRACKING_ALLOWED=true` : seulement si la conservation des observations est autorisée.
- `ETSY_ALLOWED_EMAILS` : les comptes autorisés à interroger Etsy.

## 6. Tests

Lancer `npm test` (runner natif de Node, sans dépendance ajoutée). Cas couverts :

- données manquantes (jamais converties en 0) ;
- catalogues partiels (couverture affichée) ;
- devises différentes ;
- quotas épuisés et `retry-after` ;
- réponses invalides ;
- corrections du compteur et observations manquantes ;
- comparaison de périodes incompatibles ;
- moteur non activé, découpage d'entraînement sans fuite, baseline.

**Testé avec l'API réelle : rien.** Aucune clé Etsy n'est configurée et la collecte est désactivée. Le client est testé uniquement contre des réponses simulées, au format de la spécification OpenAPI officielle.
