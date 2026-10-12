export const SITE = {
  name: 'LocalCite',
  tagline: 'Find trusted local businesses near you',
  url: 'https://example.com', // your domain, no trailing slash
  email: 'hello@example.com',
}

// Thin pages hurt the whole site (Google's "scaled content" policy), so only publish pages with enough listings.
export const MIN_CATEGORY_LISTINGS = 5 // per city + category page
export const MIN_AREA_LISTINGS = 3 // per city + category + area page
export const PAGE_SIZE = 10
