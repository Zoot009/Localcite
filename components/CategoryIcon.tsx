import {
  Activity, AirVent, Baby, Banknote, BedDouble, Beef, Blocks, BookOpen, Bone, Brain, Briefcase, Building2, Bus, CakeSlice,
  Calculator, Camera, Car, CarFront, CarTaxiFront, CircleDot, Code, Coffee, Cog, Croissant, DraftingCompass, Droplets, Dumbbell,
  Ear, EggFried, FlaskConical, Fish, Flower, Flower2, Footprints, Gem, Glasses, GraduationCap, Hammer, Hand, HandHeart, HardHat,
  Heart, HeartPulse, Hospital, Hotel, House, IceCreamCone, KeyRound, Languages, Laptop, Library, Lock, Martini, Megaphone, Music,
  Music2, Paintbrush, PaintRoller, Palmtree, PartyPopper, PawPrint, PenTool, PersonStanding, Pill, Pizza, Plane, Printer,
  Refrigerator, Salad, Sandwich, Scale, ScanFace, Scissors, Shirt, ShieldCheck, ShoppingBag, ShoppingCart, Smartphone, Smile,
  Sofa, Sparkles, SprayCan, Stethoscope, Store, Swords, Syringe, Trees, Truck, Tv, UtensilsCrossed, Venus, WashingMachine, Waves,
  Wrench, Zap, Bug, Dog, type LucideIcon,
} from 'lucide-react'

// Group → fallback icon + colour. Full class names so Tailwind keeps them.
const GROUPS: [RegExp, LucideIcon, string][] = [
  [/restaurant|food/i, UtensilsCrossed, 'bg-orange-50 text-orange-600 ring-orange-100'],
  [/nightlife/i, Martini, 'bg-purple-50 text-purple-600 ring-purple-100'],
  [/hotel|travel/i, Hotel, 'bg-sky-50 text-sky-600 ring-sky-100'],
  [/health|medical/i, Stethoscope, 'bg-emerald-50 text-emerald-600 ring-emerald-100'],
  [/beauty|spa/i, Sparkles, 'bg-pink-50 text-pink-600 ring-pink-100'],
  [/home/i, House, 'bg-amber-50 text-amber-600 ring-amber-100'],
  [/shopping|retail/i, ShoppingBag, 'bg-violet-50 text-violet-600 ring-violet-100'],
  [/auto/i, CarFront, 'bg-slate-100 text-slate-700 ring-slate-200'],
  [/professional|legal/i, Briefcase, 'bg-indigo-50 text-indigo-600 ring-indigo-100'],
  [/financ/i, Banknote, 'bg-green-50 text-green-700 ring-green-100'],
  [/real estate/i, Building2, 'bg-cyan-50 text-cyan-700 ring-cyan-100'],
  [/education/i, GraduationCap, 'bg-blue-50 text-blue-600 ring-blue-100'],
  [/active|fitness|sport/i, Dumbbell, 'bg-lime-50 text-lime-700 ring-lime-100'],
  [/pet/i, PawPrint, 'bg-rose-50 text-rose-600 ring-rose-100'],
  [/transport/i, Bus, 'bg-yellow-50 text-yellow-700 ring-yellow-100'],
  [/event|wedding/i, PartyPopper, 'bg-fuchsia-50 text-fuchsia-600 ring-fuchsia-100'],
]
const DEFAULT: [LucideIcon, string] = [Store, 'bg-brand-50 text-brand-700 ring-brand-100']

// Category name → icon. First match wins, so specific names come before general ones.
const ICONS: [RegExp, LucideIcon][] = [
  [/pizza/, Pizza], [/coffee|cafe/, Coffee], [/bakery/, Croissant], [/ice cream/, IceCreamCone], [/dessert/, CakeSlice],
  [/seafood/, Fish], [/steak/, Beef], [/vegetarian|vegan/, Salad], [/breakfast/, EggFried], [/fast food/, Sandwich],
  [/night ?club/, Music], [/\bbar\b/, Martini], [/restaurant/, UtensilsCrossed],
  [/hostel/, BedDouble], [/hotel/, Hotel], [/vacation/, Palmtree], [/travel|tour/, Plane], [/car rental/, KeyRound], [/taxi/, CarTaxiFront],
  [/dentist|dental/, Smile], [/hospital/, Hospital], [/pharmac/, Pill], [/optician|eye/, Glasses], [/dermatolog/, ScanFace],
  [/psycholog/, Brain], [/cardiolog/, HeartPulse], [/pediatric/, Baby], [/orthopedic|chiropract/, Bone], [/physio/, Activity],
  [/\bent\b/, Ear], [/laborator/, FlaskConical], [/surgeon/, Syringe], [/gyn/, Venus], [/clinic|doctor|medical/, Stethoscope],
  [/veterinar/, PawPrint], [/pet/, Dog],
  [/barber|hair/, Scissors], [/nail/, Hand], [/massage/, HandHeart], [/spa\b/, Flower2], [/tattoo/, PenTool], [/makeup|beauty/, Sparkles],
  [/gym|fitness/, Dumbbell], [/yoga|pilates/, PersonStanding], [/martial/, Swords], [/dance/, Music2], [/swim/, Waves],
  [/driving/, Car], [/language|translat/, Languages], [/preschool|daycare/, Blocks], [/tutor/, BookOpen], [/school|college|universit/, GraduationCap],
  [/injury|lawyer|attorney|law\b/, Scale], [/accountant|tax/, Calculator], [/insurance/, ShieldCheck], [/real estate|propert/, Building2],
  [/marketing|advertis/, Megaphone], [/web design|software|it service/, Code], [/architect/, DraftingCompass], [/photograph/, Camera],
  [/wedding/, Heart], [/event|venue|party/, PartyPopper], [/print/, Printer], [/cowork|office/, Laptop], [/laundr|dry clean/, WashingMachine],
  [/macbook|mobile|phone/, Smartphone], [/cleaning/, SprayCan], [/plumb/, Wrench], [/electrician/, Zap], [/locksmith/, Lock],
  [/air condition|hvac/, AirVent], [/pest/, Bug], [/roof/, House], [/painter/, PaintRoller], [/interior/, Paintbrush],
  [/carpenter/, Hammer], [/landscap|garden/, Trees], [/appliance/, Refrigerator], [/contractor|construction/, HardHat], [/moving|mover/, Truck],
  [/car wash/, Droplets], [/tire|tyre/, CircleDot], [/auto parts/, Cog], [/car repair|mechanic|auto repair/, Wrench], [/car dealer/, CarFront],
  [/clothing/, Shirt], [/electronics/, Tv], [/furniture/, Sofa], [/jewel/, Gem], [/shoe/, Footprints], [/florist|flower/, Flower],
  [/hardware/, Hammer], [/book/, Library], [/mall/, ShoppingBag], [/supermarket|grocery/, ShoppingCart],
]

export function categoryStyle(name: string, group = '') {
  const [, groupIcon, tint] = GROUPS.find(([re]) => re.test(group)) ?? [null, ...DEFAULT]
  const icon = ICONS.find(([re]) => re.test(name.toLowerCase()))?.[1] ?? groupIcon
  return { Icon: icon, tint }
}

// Tinted rounded badge (tiles, cards), or a bare icon for chips and menus: group-coloured, or `mono` to inherit the text colour.
export function CategoryIcon({ name, group, size = 44, plain = false, mono = false, className = '' }: {
  name: string; group?: string; size?: number; plain?: boolean; mono?: boolean; className?: string
}) {
  const { Icon, tint } = categoryStyle(name, group)
  if (plain || mono) return <Icon aria-hidden size={size} strokeWidth={2} className={`shrink-0 ${mono ? '' : tint.split(' ')[1]} ${className}`} />
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-xl ring-1 ring-inset ${tint} ${className}`} style={{ width: size, height: size }}>
      <Icon size={Math.round(size * 0.5)} strokeWidth={1.9} />
    </span>
  )
}

// `brand` drops the per-group colour for the site's own (used in the header menu).
export function GroupIcon({ group, size = 44, brand = false, className = '' }: { group: string; size?: number; brand?: boolean; className?: string }) {
  const [, Icon, groupTint] = GROUPS.find(([re]) => re.test(group)) ?? [null, ...DEFAULT]
  const tint = brand ? DEFAULT[1] : groupTint
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-xl ring-1 ring-inset ${tint} ${className}`} style={{ width: size, height: size }}>
      <Icon size={Math.round(size * 0.5)} strokeWidth={1.9} />
    </span>
  )
}
