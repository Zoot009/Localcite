import { fold } from './utils'

// Form rules, shared by the browser (messages while you fill a form in) and the server actions (the final check).
// A rule gets the trimmed value and returns an error message, or '' when the value is fine.
export type Rule = (value: string) => string
export type Rules = Record<string, Rule>

const EMAIL = /^[\w.%+-]+@[a-z\d-]+(?:\.[a-z\d-]+)*\.[a-z]{2,}$/i
// Letters in any alphabet, spaces and . ' ’ -  ("José", "Mary-Jane O’Neil", "R. K. Sharma")
const PERSON = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u
const HOST = /^[a-z\d-]+(?:\.[a-z\d-]+)*\.(?:[a-z]{2,}|xn--[a-z\d-]+)$/i

const required = (message: string, rule: Rule = () => ''): Rule => v => (v ? rule(v) : message)
const optional = (rule: Rule): Rule => v => (v ? rule(v) : '')
const length = (min: number, max: number, tooShort = ''): Rule => v =>
  v.length < min ? tooShort : v.length > max ? `Keep this under ${max} characters.` : ''
const both = (a: Rule, b: Rule): Rule => v => a(v) || b(v)
const words: Rule = v => (/\p{L}/u.test(v) ? '' : 'Use words, not just numbers or symbols.')

const email: Rule = v => (v.length <= 254 && EMAIL.test(v) ? '' : 'Enter a valid email address, like name@example.com.')
const phone: Rule = v => {
  const digits = v.replace(/\D/g, '').length
  return /^\+?[\d\s().-]+$/.test(v) && digits >= 7 && digits <= 15
    ? ''
    : 'Enter a valid phone number: 7 to 15 digits, starting with + and the country code if it’s abroad.'
}
const person: Rule = v => (PERSON.test(v) ? length(2, 80, 'Enter your full name.')(v) : 'Use letters only, without numbers or symbols.')
const website: Rule = v => (websiteUrl(v) ? '' : 'Enter a valid website, like example.com.')

// "example.com" or "https://example.com/menu" → the full https address; null when it isn't a web address.
export function websiteUrl(value: string) {
  if (/\s/.test(value)) return null
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    return HOST.test(url.hostname) ? url.href : null
  } catch {
    return null
  }
}

// "Valencia, Spain" (as the form suggests it; Spain and Venezuela both have one), or a name only one city has.
export function matchCity<T extends { name: string; country: string }>(cities: T[], value: string) {
  const v = fold(value)
  const named = cities.filter(c => fold(c.name) === v)
  return cities.find(c => fold(`${c.name}, ${c.country}`) === v) ?? (named.length === 1 ? named[0] : undefined)
}

// The city has to be one we cover.
export const cityRule = (cities: { name: string; country: string }[]): Rule => v =>
  !v ? 'Choose your city.' : matchCity(cities, v) ? '' : 'Choose your city from the list. We can only add businesses in the cities we cover.'

export const MESSAGES = {
  rating: 'Choose a star rating.',
  confirm: 'Tick this box to confirm you’re allowed to manage this business.',
}

// Add-a-business form (plus cityRule for the city).
export const LISTING_RULES: Rules = {
  name: required('Enter the business name.', both(length(2, 120, 'Enter the full business name.'), words)),
  category: required('Enter a category, like Dentist.', both(length(2, 60, 'Enter a category, like Dentist.'), words)),
  description: optional(length(0, 1000)),
  address: required('Enter the street address.', both(length(5, 200, 'Enter the full street address.'), words)),
  area: optional(both(length(2, 80, 'Enter the full area name.'), words)),
  phone: optional(phone),
  website: optional(website),
  hours: optional(length(0, 500)),
  contact_name: required('Enter your name.', person),
  email: required('Enter your email address.', email),
}

export const CLAIM_RULES: Rules = {
  contact_name: required('Enter your name.', person),
  email: required('Enter your work email.', email),
  phone: required('Enter your phone number.', phone),
  note: optional(length(0, 1000)),
}

export const REVIEW_RULES: Rules = {
  text: required('Write your review.', v => (v.length < 50 ? `Your review needs at least 50 characters (${50 - v.length} more).` : length(0, 5000)(v))),
  name: required('Enter your name.', person),
  email: required('Enter your email address.', email),
}

// Field → message, for each field that fails its rule.
export function check(rules: Rules, values: Record<string, string>) {
  const errors: Record<string, string> = {}
  for (const [field, rule] of Object.entries(rules)) {
    const message = rule((values[field] ?? '').trim())
    if (message) errors[field] = message
  }
  return errors
}
