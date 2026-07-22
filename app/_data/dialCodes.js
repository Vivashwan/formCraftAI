// International dialing codes for the phone field's country picker, shared by
// the form renderer (client) and the submission validator (server) so the
// accepted number lengths can't drift between them. `min`/`max` are the
// accepted national-number digit lengths for each country (ranges where a
// country allows variable lengths). India is first so it's the default.
export const DIAL_CODES = [
  { code: "+91", flag: "🇮🇳", name: "India", min: 10, max: 10 },
  { code: "+93", flag: "🇦🇫", name: "Afghanistan", min: 9, max: 9 },
  { code: "+355", flag: "🇦🇱", name: "Albania", min: 8, max: 9 },
  { code: "+213", flag: "🇩🇿", name: "Algeria", min: 9, max: 9 },
  { code: "+54", flag: "🇦🇷", name: "Argentina", min: 10, max: 11 },
  { code: "+374", flag: "🇦🇲", name: "Armenia", min: 8, max: 8 },
  { code: "+61", flag: "🇦🇺", name: "Australia", min: 9, max: 9 },
  { code: "+43", flag: "🇦🇹", name: "Austria", min: 10, max: 13 },
  { code: "+994", flag: "🇦🇿", name: "Azerbaijan", min: 9, max: 9 },
  { code: "+973", flag: "🇧🇭", name: "Bahrain", min: 8, max: 8 },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh", min: 10, max: 10 },
  { code: "+375", flag: "🇧🇾", name: "Belarus", min: 9, max: 9 },
  { code: "+32", flag: "🇧🇪", name: "Belgium", min: 8, max: 9 },
  { code: "+591", flag: "🇧🇴", name: "Bolivia", min: 8, max: 8 },
  { code: "+387", flag: "🇧🇦", name: "Bosnia & Herzegovina", min: 8, max: 8 },
  { code: "+55", flag: "🇧🇷", name: "Brazil", min: 10, max: 11 },
  { code: "+359", flag: "🇧🇬", name: "Bulgaria", min: 8, max: 9 },
  { code: "+855", flag: "🇰🇭", name: "Cambodia", min: 8, max: 9 },
  { code: "+237", flag: "🇨🇲", name: "Cameroon", min: 9, max: 9 },
  { code: "+56", flag: "🇨🇱", name: "Chile", min: 9, max: 9 },
  { code: "+86", flag: "🇨🇳", name: "China", min: 11, max: 11 },
  { code: "+57", flag: "🇨🇴", name: "Colombia", min: 10, max: 10 },
  { code: "+506", flag: "🇨🇷", name: "Costa Rica", min: 8, max: 8 },
  { code: "+385", flag: "🇭🇷", name: "Croatia", min: 8, max: 9 },
  { code: "+53", flag: "🇨🇺", name: "Cuba", min: 8, max: 8 },
  { code: "+357", flag: "🇨🇾", name: "Cyprus", min: 8, max: 8 },
  { code: "+420", flag: "🇨🇿", name: "Czechia", min: 9, max: 9 },
  { code: "+45", flag: "🇩🇰", name: "Denmark", min: 8, max: 8 },
  { code: "+593", flag: "🇪🇨", name: "Ecuador", min: 9, max: 9 },
  { code: "+20", flag: "🇪🇬", name: "Egypt", min: 10, max: 10 },
  { code: "+503", flag: "🇸🇻", name: "El Salvador", min: 8, max: 8 },
  { code: "+372", flag: "🇪🇪", name: "Estonia", min: 7, max: 8 },
  { code: "+251", flag: "🇪🇹", name: "Ethiopia", min: 9, max: 9 },
  { code: "+358", flag: "🇫🇮", name: "Finland", min: 9, max: 10 },
  { code: "+33", flag: "🇫🇷", name: "France", min: 9, max: 9 },
  { code: "+995", flag: "🇬🇪", name: "Georgia", min: 9, max: 9 },
  { code: "+49", flag: "🇩🇪", name: "Germany", min: 10, max: 11 },
  { code: "+233", flag: "🇬🇭", name: "Ghana", min: 9, max: 9 },
  { code: "+30", flag: "🇬🇷", name: "Greece", min: 10, max: 10 },
  { code: "+502", flag: "🇬🇹", name: "Guatemala", min: 8, max: 8 },
  { code: "+504", flag: "🇭🇳", name: "Honduras", min: 8, max: 8 },
  { code: "+852", flag: "🇭🇰", name: "Hong Kong", min: 8, max: 8 },
  { code: "+36", flag: "🇭🇺", name: "Hungary", min: 9, max: 9 },
  { code: "+354", flag: "🇮🇸", name: "Iceland", min: 7, max: 7 },
  { code: "+62", flag: "🇮🇩", name: "Indonesia", min: 9, max: 12 },
  { code: "+98", flag: "🇮🇷", name: "Iran", min: 10, max: 10 },
  { code: "+964", flag: "🇮🇶", name: "Iraq", min: 10, max: 10 },
  { code: "+353", flag: "🇮🇪", name: "Ireland", min: 9, max: 9 },
  { code: "+972", flag: "🇮🇱", name: "Israel", min: 9, max: 9 },
  { code: "+39", flag: "🇮🇹", name: "Italy", min: 9, max: 11 },
  { code: "+225", flag: "🇨🇮", name: "Ivory Coast", min: 10, max: 10 },
  { code: "+81", flag: "🇯🇵", name: "Japan", min: 9, max: 10 },
  { code: "+962", flag: "🇯🇴", name: "Jordan", min: 9, max: 9 },
  { code: "+254", flag: "🇰🇪", name: "Kenya", min: 9, max: 9 },
  { code: "+965", flag: "🇰🇼", name: "Kuwait", min: 8, max: 8 },
  { code: "+996", flag: "🇰🇬", name: "Kyrgyzstan", min: 9, max: 9 },
  { code: "+856", flag: "🇱🇦", name: "Laos", min: 8, max: 10 },
  { code: "+371", flag: "🇱🇻", name: "Latvia", min: 8, max: 8 },
  { code: "+961", flag: "🇱🇧", name: "Lebanon", min: 7, max: 8 },
  { code: "+218", flag: "🇱🇾", name: "Libya", min: 9, max: 9 },
  { code: "+370", flag: "🇱🇹", name: "Lithuania", min: 8, max: 8 },
  { code: "+352", flag: "🇱🇺", name: "Luxembourg", min: 9, max: 9 },
  { code: "+853", flag: "🇲🇴", name: "Macau", min: 8, max: 8 },
  { code: "+60", flag: "🇲🇾", name: "Malaysia", min: 9, max: 10 },
  { code: "+960", flag: "🇲🇻", name: "Maldives", min: 7, max: 7 },
  { code: "+356", flag: "🇲🇹", name: "Malta", min: 8, max: 8 },
  { code: "+52", flag: "🇲🇽", name: "Mexico", min: 10, max: 10 },
  { code: "+373", flag: "🇲🇩", name: "Moldova", min: 8, max: 8 },
  { code: "+976", flag: "🇲🇳", name: "Mongolia", min: 8, max: 8 },
  { code: "+382", flag: "🇲🇪", name: "Montenegro", min: 8, max: 8 },
  { code: "+212", flag: "🇲🇦", name: "Morocco", min: 9, max: 9 },
  { code: "+95", flag: "🇲🇲", name: "Myanmar", min: 8, max: 10 },
  { code: "+977", flag: "🇳🇵", name: "Nepal", min: 10, max: 10 },
  { code: "+31", flag: "🇳🇱", name: "Netherlands", min: 9, max: 9 },
  { code: "+64", flag: "🇳🇿", name: "New Zealand", min: 8, max: 10 },
  { code: "+505", flag: "🇳🇮", name: "Nicaragua", min: 8, max: 8 },
  { code: "+234", flag: "🇳🇬", name: "Nigeria", min: 8, max: 10 },
  { code: "+389", flag: "🇲🇰", name: "North Macedonia", min: 8, max: 8 },
  { code: "+47", flag: "🇳🇴", name: "Norway", min: 8, max: 8 },
  { code: "+968", flag: "🇴🇲", name: "Oman", min: 8, max: 8 },
  { code: "+92", flag: "🇵🇰", name: "Pakistan", min: 10, max: 10 },
  { code: "+507", flag: "🇵🇦", name: "Panama", min: 8, max: 8 },
  { code: "+595", flag: "🇵🇾", name: "Paraguay", min: 9, max: 9 },
  { code: "+51", flag: "🇵🇪", name: "Peru", min: 9, max: 9 },
  { code: "+63", flag: "🇵🇭", name: "Philippines", min: 10, max: 10 },
  { code: "+48", flag: "🇵🇱", name: "Poland", min: 9, max: 9 },
  { code: "+351", flag: "🇵🇹", name: "Portugal", min: 9, max: 9 },
  { code: "+974", flag: "🇶🇦", name: "Qatar", min: 8, max: 8 },
  { code: "+40", flag: "🇷🇴", name: "Romania", min: 9, max: 9 },
  { code: "+7", flag: "🇷🇺", name: "Russia", min: 10, max: 10 },
  { code: "+250", flag: "🇷🇼", name: "Rwanda", min: 9, max: 9 },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia", min: 9, max: 9 },
  { code: "+221", flag: "🇸🇳", name: "Senegal", min: 9, max: 9 },
  { code: "+381", flag: "🇷🇸", name: "Serbia", min: 8, max: 9 },
  { code: "+65", flag: "🇸🇬", name: "Singapore", min: 8, max: 8 },
  { code: "+421", flag: "🇸🇰", name: "Slovakia", min: 9, max: 9 },
  { code: "+386", flag: "🇸🇮", name: "Slovenia", min: 8, max: 8 },
  { code: "+27", flag: "🇿🇦", name: "South Africa", min: 9, max: 9 },
  { code: "+82", flag: "🇰🇷", name: "South Korea", min: 9, max: 10 },
  { code: "+34", flag: "🇪🇸", name: "Spain", min: 9, max: 9 },
  { code: "+94", flag: "🇱🇰", name: "Sri Lanka", min: 9, max: 9 },
  { code: "+249", flag: "🇸🇩", name: "Sudan", min: 9, max: 9 },
  { code: "+46", flag: "🇸🇪", name: "Sweden", min: 7, max: 9 },
  { code: "+41", flag: "🇨🇭", name: "Switzerland", min: 9, max: 9 },
  { code: "+963", flag: "🇸🇾", name: "Syria", min: 9, max: 9 },
  { code: "+886", flag: "🇹🇼", name: "Taiwan", min: 9, max: 9 },
  { code: "+255", flag: "🇹🇿", name: "Tanzania", min: 9, max: 9 },
  { code: "+66", flag: "🇹🇭", name: "Thailand", min: 9, max: 9 },
  { code: "+216", flag: "🇹🇳", name: "Tunisia", min: 8, max: 8 },
  { code: "+90", flag: "🇹🇷", name: "Turkey", min: 10, max: 10 },
  { code: "+993", flag: "🇹🇲", name: "Turkmenistan", min: 8, max: 8 },
  { code: "+256", flag: "🇺🇬", name: "Uganda", min: 9, max: 9 },
  { code: "+380", flag: "🇺🇦", name: "Ukraine", min: 9, max: 9 },
  { code: "+971", flag: "🇦🇪", name: "United Arab Emirates", min: 8, max: 9 },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom", min: 9, max: 10 },
  { code: "+1", flag: "🇺🇸", name: "United States & Canada", min: 10, max: 10 },
  { code: "+598", flag: "🇺🇾", name: "Uruguay", min: 8, max: 8 },
  { code: "+998", flag: "🇺🇿", name: "Uzbekistan", min: 9, max: 9 },
  { code: "+58", flag: "🇻🇪", name: "Venezuela", min: 10, max: 10 },
  { code: "+84", flag: "🇻🇳", name: "Vietnam", min: 9, max: 10 },
  { code: "+967", flag: "🇾🇪", name: "Yemen", min: 9, max: 9 },
  { code: "+260", flag: "🇿🇲", name: "Zambia", min: 9, max: 9 },
  { code: "+263", flag: "🇿🇼", name: "Zimbabwe", min: 9, max: 9 },
];

export const DEFAULT_DIAL_CODE = "+91";

export const dialEntry = (code) => DIAL_CODES.find((d) => d.code === code);

// Validates a stored phone value ("<code> <number>"). Returns an error string
// or null. Used on both client and server.
export function phoneLengthError(value) {
  const str = String(value ?? "").trim();
  if (str === "") return null; // emptiness handled by "required"
  // Stored as "<code> <number>"; the space separates them unambiguously.
  let entry;
  let rest = str;
  const sp = str.indexOf(" ");
  if (sp !== -1) {
    entry = dialEntry(str.slice(0, sp));
    rest = str.slice(sp + 1);
  } else {
    // Fallback: match the longest code that prefixes the value.
    entry = [...DIAL_CODES]
      .sort((a, b) => b.code.length - a.code.length)
      .find((d) => str.startsWith(d.code));
    if (entry) rest = str.slice(entry.code.length);
  }
  const national = rest.replace(/\D/g, "");
  const min = entry?.min ?? 6;
  const max = entry?.max ?? 15;
  if (national.length < min || national.length > max) {
    return min === max
      ? `Enter a valid ${min}-digit phone number.`
      : `Enter a valid phone number (${min}–${max} digits).`;
  }
  return null;
}
